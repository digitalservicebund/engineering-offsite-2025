/**
 * ViewportController - Manages viewport panning and transform state
 * Handles keyboard-controlled horizontal scrolling with smooth CSS transitions
 *
 * Uses configurable viewport position (LAYOUT.scroll.currentPositionRatio) as the "current" date marker.
 * Timeline includes left padding so early events can appear at the current position marker.
 */

import type * as d3 from 'd3';
import { LAYOUT } from './config';
import type { ScrollState, ScrollDirection, KeyEventPosition } from './types';

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

  private currentOffset: number;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  // Auto-scroll state machine properties
  private scrollState: ScrollState = 'idle';
  private scrollDirection: ScrollDirection = 'forward';
  private keyEventPositions: KeyEventPosition[] = [];
  private lastFrameTimestamp: number | null = null;
  private autoScrollFrameId: number | null = null;
  private pausedAtEventId: string | null = null;

  constructor(
    container: HTMLElement,
    timelineWidth: number,
    xScale: d3.ScaleTime<number, number>,
    startDate: Date,
    endDate: Date,
    keyEventPositions: KeyEventPosition[],
    onViewportChange?: (date: Date) => void,
    onKeyEventReached?: (eventId: string | null) => void
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

    console.log(`ViewportController initialized with ${keyEventPositions.length} key events`);

    // Calculate scroll boundaries
    this.minOffset = this.calculateMinOffset();
    this.maxOffset = this.calculateMaxOffset();

    // Initialize position and apply transform
    this.currentOffset = this.minOffset;
    this.applyTransform(false);

    // Setup event listener for animation completion
    this.setupTransitionEndListener();

    // Notify initial viewport position
    this.notifyViewportChange();
  }

  /**
   * Calculate left padding needed for first event to be at the current position marker
   */
  private calculateMinOffset(): number {
    return -(this.viewportWidth * LAYOUT.scroll.currentPositionRatio);
  }

  /**
   * Calculate maximum offset (when timeline end reaches the current position marker)
   */
  private calculateMaxOffset(): number {
    return this.timelineWidth - this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
  }

  /**
   * Setup listener to reset animation flag when CSS transition completes
   */
  private setupTransitionEndListener(): void {
    this.container.addEventListener('transitionend', () => {
      this.isAnimating = false;
      this.stopContinuousUpdate();
    });
  }

  /**
   * Start continuous counter updates during animation
   */
  private startContinuousUpdate(): void {
    // Cancel any existing animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    const update = (): void => {
      this.notifyViewportChange();

      // Continue updating while animating
      if (this.isAnimating) {
        this.animationFrameId = requestAnimationFrame(update);
      } else {
        this.animationFrameId = null;
      }
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  /**
   * Stop continuous updates
   */
  private stopContinuousUpdate(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    // Final update when animation completes
    this.notifyViewportChange();
  }

  /**
   * Notify callback of current viewport center date
   */
  private notifyViewportChange(): void {
    if (this.onViewportChange) {
      const centerDate = this.getCurrentCenterDate();
      this.onViewportChange(centerDate);
    }
  }

  /**
   * Pan timeline to the right by specified distance
   * @deprecated Use auto-scroll methods (startAutoScroll) instead for smooth continuous scrolling
   * Kept for backward compatibility and potential manual control needs
   */
  public panRight(distance: number): void {
    if (this.isAnimating) return;

    const newOffset = Math.min(this.maxOffset, this.currentOffset + distance);

    // Only apply transform if offset actually changes
    if (newOffset !== this.currentOffset) {
      this.currentOffset = newOffset;
      this.applyTransform();
      this.startContinuousUpdate();
    }
  }

  /**
   * Pan timeline to the left by specified distance
   * @deprecated Use auto-scroll methods (startAutoScroll) instead for smooth continuous scrolling
   * Kept for backward compatibility and potential manual control needs
   */
  public panLeft(distance: number): void {
    if (this.isAnimating) return;

    const newOffset = Math.max(this.minOffset, this.currentOffset - distance);

    // Only apply transform if offset actually changes
    if (newOffset !== this.currentOffset) {
      this.currentOffset = newOffset;
      this.applyTransform();
      this.startContinuousUpdate();
    }
  }

  /**
   * Get the date at the current position marker (configured via LAYOUT.scroll.currentPositionRatio)
   * Used for calculating counter values
   * Reads the actual current transform value during animations for real-time accuracy
   */
  public getCurrentCenterDate(): Date {
    const currentPositionX = this.calculateCurrentPositionX();
    const currentDate = this.xScale.invert(currentPositionX);

    return this.clampDateToTimelineBounds(currentDate);
  }

  /**
   * Calculate the x-position at the current position marker
   * During CSS transitions, reads the actual animated transform value
   */
  private calculateCurrentPositionX(): number {
    let actualOffset = this.currentOffset;

    // During animation, read the actual transform value from the DOM
    if (this.isAnimating) {
      const style = window.getComputedStyle(this.container);
      const transform = style.transform;

      if (transform && transform !== 'none') {
        const matrix = new DOMMatrix(transform);
        actualOffset = -matrix.m41; // m41 is the x translation component
      }
    }

    return actualOffset + this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
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
   * @param animate - If true, uses CSS transitions (for manual panning). If false, instant update (for auto-scroll).
   */
  private applyTransform(animate = true): void {
    if (animate) {
      this.isAnimating = true;
      // Ensure CSS transition is enabled
      this.container.style.transition = `transform ${LAYOUT.scroll.transitionDuration}ms ${LAYOUT.scroll.transitionEasing}`;
    } else {
      // Disable CSS transition for instant updates (auto-scroll)
      this.container.style.transition = 'none';
    }

    // Negate currentOffset to get proper CSS translateX value
    this.container.style.transform = `translateX(${-this.currentOffset}px)`;
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
   * Get current scroll direction
   */
  public getScrollDirection(): ScrollDirection {
    return this.scrollDirection;
  }

  /**
   * Get paused event ID (null if not paused at key event)
   */
  public getPausedEventId(): string | null {
    return this.pausedAtEventId;
  }

  /**
   * Start auto-scroll in the specified direction
   * Entry point for continuous scrolling at fixed speed (200px/sec)
   */
  public startAutoScroll(direction: ScrollDirection): void {
    // Set state
    this.scrollState = 'scrolling';
    this.scrollDirection = direction;
    this.lastFrameTimestamp = null; // Will be set on first frame
    this.pausedAtEventId = null;

    // Cancel any existing auto-scroll animation frame
    if (this.autoScrollFrameId !== null) {
      cancelAnimationFrame(this.autoScrollFrameId);
      this.autoScrollFrameId = null;
    }

    // Start the auto-scroll loop
    this.autoScrollFrameId = requestAnimationFrame((timestamp) =>
      this.autoScrollLoop(timestamp)
    );

    console.log(`Auto-scroll started (${direction})`);
  }

  /**
   * Auto-scroll loop - called every frame via requestAnimationFrame
   * Implements smooth scrolling at constant speed (200px/sec)
   */
  private autoScrollLoop(timestamp: number): void {
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

    // 3. Calculate distance to move based on speed and elapsed time
    // Speed: 200px/sec = 0.2px/ms
    const distance = (LAYOUT.autoScroll.speed / 1000) * elapsed;

    // 4. Apply movement based on direction
    if (this.scrollDirection === 'forward') {
      this.currentOffset += distance;
    } else {
      this.currentOffset -= distance;
    }

    // 5. Clamp to boundaries
    const wasClamped = 
      (this.scrollDirection === 'forward' && this.currentOffset >= this.maxOffset) ||
      (this.scrollDirection === 'backward' && this.currentOffset <= this.minOffset);
    
    this.currentOffset = Math.max(this.minOffset, Math.min(this.maxOffset, this.currentOffset));

    // Check if we hit a boundary - stop auto-scroll
    if (wasClamped) {
      this.scrollState = 'idle';
      this.autoScrollFrameId = null;
      this.applyTransform(false);
      this.notifyViewportChange();
      console.log(`Auto-scroll stopped: reached timeline ${this.scrollDirection === 'forward' ? 'end' : 'start'}`);
      return;
    }

    // 6. Apply transform without CSS transition (instant update for smooth animation)
    this.applyTransform(false);

    // 7. Check if reached key event → pause if within threshold
    const shouldPause = this.checkForKeyEventPause();
    if (shouldPause) {
      return; // Exit loop, state is now 'paused'
    }

    // 8. Update counters via onViewportChange callback
    this.notifyViewportChange();

    // 9. Store timestamp already done above (step 2)

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
    this.pausedAtEventId = null;

    console.log('Auto-scroll stopped');
  }

  /**
   * Resume auto-scroll from paused state
   * Continues scrolling in current direction from where we paused
   */
  public resumeAutoScroll(): void {
    // Only resume if currently paused
    if (this.scrollState !== 'paused') {
      return;
    }

    // Set state to scrolling
    this.scrollState = 'scrolling';
    this.lastFrameTimestamp = null; // Restart timing from scratch
    this.pausedAtEventId = null;

    // Restart the auto-scroll loop
    this.autoScrollFrameId = requestAnimationFrame((timestamp) =>
      this.autoScrollLoop(timestamp)
    );

    console.log(`Auto-scroll resumed (${this.scrollDirection})`);
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
   * Check if we've reached a key event and should pause
   * Monitors scroll position and pauses when within threshold of key events
   */
  private checkForKeyEventPause(): boolean {
    // Skip if no key events configured
    if (this.keyEventPositions.length === 0) {
      return false;
    }

    // Get current position marker x (where we consider "current" to be)
    const currentPositionX = this.currentOffset + this.viewportWidth * LAYOUT.scroll.currentPositionRatio;

    // Find next key event in scroll direction
    let targetKeyEvent: KeyEventPosition | null = null;

    if (this.scrollDirection === 'forward') {
      // Find first key event ahead of current position
      for (const keyEvent of this.keyEventPositions) {
        if (keyEvent.xPosition > currentPositionX) {
          targetKeyEvent = keyEvent;
          break;
        }
      }
    } else {
      // Backward: find last key event behind current position
      for (let i = this.keyEventPositions.length - 1; i >= 0; i--) {
        const keyEvent = this.keyEventPositions[i];
        if (keyEvent.xPosition < currentPositionX) {
          targetKeyEvent = keyEvent;
          break;
        }
      }
    }

    // No key event found in this direction
    if (!targetKeyEvent) {
      return false;
    }

    // Check if within threshold
    const distance = Math.abs(currentPositionX - targetKeyEvent.xPosition);
    if (distance <= LAYOUT.autoScroll.keyEventPauseThreshold) {
      // Pause!
      this.scrollState = 'paused';
      this.pausedAtEventId = targetKeyEvent.eventId;

      // Snap to exact key event position for precision
      this.currentOffset = targetKeyEvent.xPosition - this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
      this.applyTransform(false);

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
