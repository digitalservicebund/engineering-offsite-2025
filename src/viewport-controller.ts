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

  private currentOffset: number;
  private isAnimating = false;

  constructor(
    container: HTMLElement,
    timelineWidth: number,
    xScale: d3.ScaleTime<number, number>,
    startDate: Date,
    endDate: Date
  ) {
    this.container = container;
    this.timelineWidth = timelineWidth;
    this.viewportWidth = LAYOUT.viewport.width;
    this.xScale = xScale;
    this.startDate = startDate;
    this.endDate = endDate;

    // Calculate scroll boundaries
    this.minOffset = this.calculateMinOffset();
    this.maxOffset = this.calculateMaxOffset();

    // Initialize position and apply transform
    this.currentOffset = this.minOffset;
    this.applyTransform(false);

    // Setup event listener for animation completion
    this.setupTransitionEndListener();
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
    });
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
    }
  }

  /**
   * Get the date at the current position marker (configured via LAYOUT.scroll.currentPositionRatio)
   * Used for calculating counter values
   */
  public getCurrentCenterDate(): Date {
    const currentPositionX = this.calculateCurrentPositionX();
    const currentDate = this.xScale.invert(currentPositionX);

    return this.clampDateToTimelineBounds(currentDate);
  }

  /**
   * Calculate the x-position at the current position marker
   */
  private calculateCurrentPositionX(): number {
    return this.currentOffset + this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
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
