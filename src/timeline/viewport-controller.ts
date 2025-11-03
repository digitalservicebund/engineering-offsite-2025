/**
 * ViewportController - Manages viewport panning and transform state
 * Handles keyboard-controlled horizontal scrolling with smooth CSS transitions
 *
 * Uses configurable viewport position (LAYOUT.scroll.currentPositionRatio) as the "current" date marker.
 * Timeline includes left padding so early events can appear at the current position marker.
 */

import type * as d3 from 'd3';
import { LAYOUT } from './config';
import type { ScrollState, KeyEventPosition } from './types';

export class ViewportController {
  private readonly container: HTMLElement;
  private readonly timelineWidth: number;
  private readonly viewportWidth: number;
  private readonly maxOffset: number;
  private readonly minOffset: number;
  private readonly xScale: d3.ScaleTime<number, number>;
  private readonly startDate: Date;
  private readonly endDate: Date;
  private readonly onViewportChange?: (date: Date) => void;
  private readonly onKeyEventReached?: (eventId: string | null) => void;
  private readonly onParticleUpdate?: (currentPositionX: number) => void;
  private readonly onFpsUpdate?: (timestamp: number) => void;

  private currentOffset: number;

  // Auto-scroll state machine properties
  private scrollState: ScrollState = 'idle';
  private keyEventPositions: KeyEventPosition[] = [];
  private lastFrameTimestamp: number | null = null;
  private autoScrollFrameId: number | null = null;
  private visitedKeyEventIds: Set<string> = new Set(); // Track key events we've already paused at
  private isShiftPressed: boolean = false;
  
  // Zoom-out state
  private isZoomedOut: boolean = false;

  constructor(
    container: HTMLElement,
    timelineWidth: number,
    xScale: d3.ScaleTime<number, number>,
    startDate: Date,
    endDate: Date,
    keyEventPositions: KeyEventPosition[],
    onViewportChange?: (date: Date) => void,
    onKeyEventReached?: (eventId: string | null) => void,
    onParticleUpdate?: (currentPositionX: number) => void,
    onFpsUpdate?: (timestamp: number) => void
  ) {
    this.container = container;
    this.timelineWidth = timelineWidth;
    this.viewportWidth = LAYOUT.viewport.width;
    this.xScale = xScale;
    this.startDate = startDate;
    this.endDate = endDate;
    this.keyEventPositions = keyEventPositions;
    this.onViewportChange = onViewportChange;
    this.onKeyEventReached = onKeyEventReached;
    this.onParticleUpdate = onParticleUpdate;
    this.onFpsUpdate = onFpsUpdate;

    console.log(`ViewportController initialized with ${keyEventPositions.length} key events`);

    // Calculate scroll boundaries
    this.minOffset = this.calculateMinOffset();
    this.maxOffset = this.calculateMaxOffset();

    // Initialize position and apply transform
    this.currentOffset = this.minOffset;
    
    this.applyTransform();

    // Notify initial viewport position
    this.notifyViewportChange();
  }

  /**
   * Calculate left padding needed for first event to be at the current position marker
   */
  private calculateMinOffset(): number {
    const overlayX = this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
    return -overlayX;
  }

  /**
   * Calculate maximum offset (when timeline end reaches the current position marker)
   */
  private calculateMaxOffset(): number {
    const overlayX = this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
    return this.timelineWidth - overlayX;
  }

  /**
   * Notify callback of current viewport position date
   */
  private notifyViewportChange(): void {
    if (this.onViewportChange) {
      const currentDate = this.getCurrentPositionDate();
      this.onViewportChange(currentDate);
    }
  }

  /**
   * Get the date at the current position marker (configured via LAYOUT.scroll.currentPositionRatio)
   * Used for calculating counter values
   */
  public getCurrentPositionDate(): Date {
    const currentPositionX = this.calculateCurrentPositionX();
    const currentDate = this.xScale.invert(currentPositionX);

    return this.clampDateToTimelineBounds(currentDate);
  }

  /**
   * Calculate the x-position at the current position marker
   */
  private calculateCurrentPositionX(): number {
    const overlayX = this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
    return this.currentOffset + overlayX;
  }

  /**
   * Clamp date to timeline boundaries
   */
  private clampDateToTimelineBounds(date: Date): Date {
    if (date < this.startDate) return this.startDate;
    if (date > this.endDate) return this.endDate;
    return date;
  }

  /**
   * Apply CSS transform to pan the timeline
   * When currentOffset is negative (initial state), timeline moves right to show left padding
   * When currentOffset is positive (panning right), timeline moves left to reveal content on right
   */
  private applyTransform(): void {
    // Disable CSS transition for instant updates
    this.container.style.transition = 'none';

    // Negate currentOffset to get proper CSS translateX value
    // Subtract leftPadding because content group is already translated by that amount in SVG space
    const leftPadding = LAYOUT.laneLabels.leftPadding;
    const transformValue = -this.currentOffset - leftPadding;
    this.container.style.transform = `translateX(${transformValue}px)`;
  }

  /**
   * Get current offset (for debugging/testing)
   */
  public getCurrentOffset(): number {
    return this.currentOffset;
  }

  /**
   * Get current scroll state
   */
  public getScrollState(): ScrollState {
    return this.scrollState;
  }

  /**
   * Get visited key event IDs (for debugging/testing)
   */
  public getVisitedKeyEventIds(): Set<string> {
    return this.visitedKeyEventIds;
  }

  /**
   * Start auto-scroll (always forward)
   * Entry point for continuous scrolling at fixed speed (200px/sec)
   */
  public startAutoScroll(): void {
    // Don't start if zoomed out - user must reset first
    if (this.isZoomedOut) {
      console.log('Cannot start auto-scroll: timeline is zoomed out. Press Left Arrow to reset.');
      return;
    }
    
    // Set state
    this.scrollState = 'scrolling';
    this.lastFrameTimestamp = null; // Will be set on first frame

    // Cancel any existing auto-scroll animation frame
    if (this.autoScrollFrameId !== null) {
      cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = null;
    }

    // Start the auto-scroll loop
    this.autoScrollFrameId = requestAnimationFrame((timestamp) =>
      this.autoScrollLoop(timestamp)
    );

    console.log('Auto-scroll started');
  }

  /**
   * Set Shift pressed state to control speed multiplier
   */
  public setShiftPressed(pressed: boolean): void {
    this.isShiftPressed = pressed;
  }

  /**
   * Auto-scroll loop - called every frame via requestAnimationFrame
   * Implements smooth scrolling at constant speed (200px/sec)
   */
  private autoScrollLoop(timestamp: number): void {
    // 0. Record frame for FPS tracking
    if (this.onFpsUpdate) {
      this.onFpsUpdate(timestamp);
    }

    // 1. Exit if no longer scrolling
    if (this.scrollState !== 'scrolling') {
      this.autoScrollFrameId = null;
      return;
    }

    // 2. Calculate elapsed time since last frame
    let elapsed = 0;
    if (this.lastFrameTimestamp !== null) {
      elapsed = timestamp - this.lastFrameTimestamp;
    }
    this.lastFrameTimestamp = timestamp;

    // 3. Calculate distance to move based on speed, modifier, and elapsed time
    // Base speed: px/sec → px/ms; apply Shift multiplier when pressed
    const speedMultiplier = this.isShiftPressed ? LAYOUT.autoScroll.shiftSpeedMultiplier : 1;
    const distance = ((LAYOUT.autoScroll.speed * speedMultiplier) / 1000) * elapsed;

    // 4. Apply movement
    this.currentOffset += distance;

    // 5. Clamp to boundaries
    const wasClamped = this.currentOffset >= this.maxOffset;
    
    this.currentOffset = Math.max(this.minOffset, Math.min(this.maxOffset, this.currentOffset));

    // Check if we hit a boundary - trigger zoom-out effect
    if (wasClamped) {
      this.autoScrollFrameId = null;
      this.applyTransform();
      this.notifyViewportChange();
      console.log('Auto-scroll stopped: reached timeline end');
      
      // Trigger zoom-out effect to show full timeline
      this.triggerZoomOut();
      return;
    }

    // 6. Apply transform for smooth animation
    this.applyTransform();

    // 7. Check if reached key event → pause if within threshold
    const shouldPause = this.checkForKeyEventPause();
    if (shouldPause) {
      return; // Exit loop, state is now 'paused'
    }

    // 8. Update counters via onViewportChange callback
    this.notifyViewportChange();

    // 9. Update particle animations
    if (this.onParticleUpdate) {
      const currentPositionX = this.calculateCurrentPositionX();
      this.onParticleUpdate(currentPositionX);
    }

    // 10. Schedule next frame
    this.autoScrollFrameId = requestAnimationFrame((ts) => this.autoScrollLoop(ts));
  }

  /**
   * Stop auto-scroll
   * Clean shutdown of auto-scroll system
   */
  public stopAutoScroll(): void {
    // Cancel animation frame if active
    if (this.autoScrollFrameId !== null) {
      cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = null;
    }

    // Reset state
    this.scrollState = 'idle';
    this.lastFrameTimestamp = null;
    this.visitedKeyEventIds.clear();

    console.log('Auto-scroll stopped');
  }

  /**
   * Resume auto-scroll from paused state
   */
  public resumeAutoScroll(): void {
    // Only resume if currently paused
    if (this.scrollState !== 'paused') {
      return;
    }

    // Set state to scrolling
    this.scrollState = 'scrolling';
    this.lastFrameTimestamp = null; // Restart timing from scratch

    // Restart the auto-scroll loop
    this.autoScrollFrameId = requestAnimationFrame((timestamp) =>
      this.autoScrollLoop(timestamp)
    );

    console.log('Auto-scroll resumed');
  }

  /**
   * Toggle pause/resume during auto-scroll
   * Space bar toggle functionality while scrolling
   */
  public togglePause(): void {
    if (this.scrollState === 'scrolling') {
      // Pause scrolling
      this.scrollState = 'paused';

      // Cancel animation frame
      if (this.autoScrollFrameId !== null) {
        cancelAnimationFrame(this.autoScrollFrameId);
        this.autoScrollFrameId = null;
      }

      console.log('Auto-scroll paused (manual toggle)');
    } else if (this.scrollState === 'paused') {
      // Resume scrolling
      this.resumeAutoScroll();
    }
  }

  /**
   * Reset timeline to start position
   * Clean slate for presenter to restart presentation
   */
  public resetToStart(): void {
    // Stop any active auto-scroll
    this.stopAutoScroll();
    
    // Reset zoom state if zoomed out
    if (this.isZoomedOut) {
      // Remove final overlay if present
      const finalOverlay = document.querySelector('.final-overlay');
      if (finalOverlay) {
        finalOverlay.remove();
      }
      
      // Show overlays again
      const markerEl = document.querySelector('.current-date-marker') as HTMLElement;
      const fadeEl = document.querySelector('.future-fade-overlay') as HTMLElement;
      if (markerEl) markerEl.style.opacity = '1';
      if (fadeEl) fadeEl.style.opacity = '1';
      
      this.container.style.transition = 'transform 0.5s ease-out';
      this.container.style.transform = 'translate(0, 0) scale(1)';
      this.isZoomedOut = false;
      
      // Wait for zoom-in transition to complete before resetting position
      setTimeout(() => {
        this.container.style.transition = 'none';
        this.currentOffset = this.minOffset;
        this.applyTransform();
        this.notifyViewportChange();
      }, 500);
    } else {
      // Normal reset without zoom transition
      this.currentOffset = this.minOffset;
      this.applyTransform();
      this.notifyViewportChange();
    }

    console.log('Timeline reset to start');
  }

  /**
   * Trigger zoom-out effect to show entire timeline
   * Called when auto-scroll reaches the end of the timeline
   */
  private triggerZoomOut(): void {
    if (!LAYOUT.zoomOut.enabled) {
      return;
    }

    console.log('Triggering zoom-out to show full timeline');
    
    this.isZoomedOut = true;
    this.scrollState = 'idle'; // Stop scroll state machine
    
    // Hide overlays (current date marker and future fade)
    const markerEl = document.querySelector('.current-date-marker') as HTMLElement;
    const fadeEl = document.querySelector('.future-fade-overlay') as HTMLElement;
    if (markerEl) markerEl.style.opacity = '0';
    if (fadeEl) fadeEl.style.opacity = '0';
    
    // Calculate scale factor to fit entire timeline in viewport (both axes)
    const timelineContentWidth = this.timelineWidth;
    const timelineContentHeight = LAYOUT.viewport.height;
    const viewportWidth = this.viewportWidth;
    const viewportHeight = LAYOUT.viewport.height;
    const padding = LAYOUT.zoomOut.padding;
    
    const availableWidth = viewportWidth - (padding * 2);
    const availableHeight = viewportHeight - (padding * 2);
    
    // Use the smaller scale factor to ensure everything fits
    const scaleFactorX = availableWidth / timelineContentWidth;
    const scaleFactorY = availableHeight / timelineContentHeight;
    const scaleFactor = Math.min(scaleFactorX, scaleFactorY);
    
    // Calculate centering offsets for both axes
    const scaledWidth = timelineContentWidth * scaleFactor;
    const scaledHeight = timelineContentHeight * scaleFactor;
    const centerX = (viewportWidth - scaledWidth) / 2;
    const centerY = (viewportHeight - scaledHeight) / 2;
    
    // Apply CSS transform with transition (scale both axes, center both axes)
    const duration = LAYOUT.zoomOut.duration;
    const mtmDelay = 500;
    const easing = LAYOUT.zoomOut.easing;
    
    this.container.style.transition = `transform ${duration}ms ${easing}`;
    this.container.style.transform = `translate(${centerX}px, ${centerY}px) scale(${scaleFactor})`;
    this.container.style.transformOrigin = '0 0'; // Scale from top-left
    
    // Show final image overlay after zoom-out completes
    setTimeout(() => {
      console.log('Zoom-out complete: full timeline visible');
      this.showFinalOverlay();
    }, duration + mtmDelay);
  }

  /**
   * Show final overlay image after zoom-out completes
   */
  private showFinalOverlay(): void {
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.className = 'final-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.8);
      z-index: 9999;
      opacity: 0;
      transition: opacity 0.8s ease-in;
    `;

    // Create image element
    const img = document.createElement('img');
    img.src = '/assets/merge-to-main.png';
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    `;

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    console.log('Final overlay displayed');
  }

  /**
   * Check if we've reached a key event and should pause
   * Monitors scroll position and pauses when within threshold of key events
   */
  private checkForKeyEventPause(): boolean {
    // Skip if no key events configured
    if (this.keyEventPositions.length === 0) {
      return false;
    }

    // Get current position marker x (where we consider "current" to be)
    const currentPositionX = this.calculateCurrentPositionX();

    // Find next unvisited key event ahead of current position
    let targetKeyEvent: KeyEventPosition | null = null;

    for (const keyEvent of this.keyEventPositions) {
      // Skip events we've already paused at
      if (this.visitedKeyEventIds.has(keyEvent.eventId)) {
        continue;
      }
      
      // Find first event ahead of current position
      if (keyEvent.xPosition > currentPositionX) {
        targetKeyEvent = keyEvent;
        break;
      }
    }

    // No unvisited key event found ahead
    if (!targetKeyEvent) {
      return false;
    }

    // Check if within threshold (distance should always be positive since target is ahead)
    const distance = targetKeyEvent.xPosition - currentPositionX;
    if (distance <= LAYOUT.autoScroll.keyEventPauseThreshold) {
      // Pause at current position (no snap to avoid visual jump and particle misalignment)
      this.scrollState = 'paused';
      
      // Mark this event as visited so we never pause here again
      this.visitedKeyEventIds.add(targetKeyEvent.eventId);

      console.log(`Paused at key event: "${targetKeyEvent.eventName}" (${targetKeyEvent.eventId})`);

      // Final counter update at paused position
      this.notifyViewportChange();

      // Trigger visual highlight
      if (this.onKeyEventReached) {
        this.onKeyEventReached(targetKeyEvent.eventId);
      }

      return true; // Pause triggered
    }

    return false; // Continue scrolling
  }
}
