/**
 * ViewportController - Manages viewport panning and transform state
 * Handles keyboard-controlled horizontal scrolling with smooth CSS transitions
 *
 * Uses configurable viewport position (LAYOUT.scroll.currentPositionRatio) as the "current" date marker.
 * Timeline includes left padding so early events can appear at the current position marker.
 */

import type * as d3 from 'd3';
import { LAYOUT } from './config';

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

  private currentOffset: number;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  constructor(
    container: HTMLElement,
    timelineWidth: number,
    xScale: d3.ScaleTime<number, number>,
    startDate: Date,
    endDate: Date,
    onViewportChange?: (date: Date) => void
  ) {
    this.container = container;
    this.timelineWidth = timelineWidth;
    this.viewportWidth = LAYOUT.viewport.width;
    this.xScale = xScale;
    this.startDate = startDate;
    this.endDate = endDate;
    this.onViewportChange = onViewportChange;

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
   */
  private applyTransform(animate = true): void {
    if (animate) {
      this.isAnimating = true;
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
}
