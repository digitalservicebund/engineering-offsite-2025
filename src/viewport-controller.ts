/**
 * ViewportController - Manages viewport panning and transform state
 * Handles keyboard-controlled horizontal scrolling with smooth CSS transitions
 * 
 * Uses configurable viewport position (LAYOUT.scroll.currentPositionRatio) as the "current" date marker.
 * Timeline includes left padding so early events can appear at the current position marker.
 */

import * as d3 from 'd3';
import { LAYOUT } from './config';

export class ViewportController {
  private currentOffset: number = 0;
  private timelineWidth: number;
  private viewportWidth: number;
  private maxOffset: number;
  private minOffset: number;
  private isAnimating: boolean = false;
  private container: HTMLElement;
  private xScale: d3.ScaleTime<number, number>;
  private startDate: Date;
  private endDate: Date;

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
    
    // Calculate left padding needed for first event to be at the current position marker
    // At offset 0, the current position marker should show the timeline start (x=0)
    // So we need to start with negative offset
    this.minOffset = -(this.viewportWidth * LAYOUT.scroll.currentPositionRatio);
    
    // Calculate maximum offset (when timeline end reaches the current position marker)
    // Timeline can scroll until its end is at the current position
    this.maxOffset = this.timelineWidth - (this.viewportWidth * LAYOUT.scroll.currentPositionRatio);
    
    // Start at minimum offset so timeline begins at the current position marker
    this.currentOffset = this.minOffset;
    this.applyTransform(false); // No transition on initial position
    
    // Listen for transitionend to reset isAnimating flag
    this.container.addEventListener('transitionend', () => {
      this.isAnimating = false;
    });
  }

  /**
   * Pan timeline to the right by specified distance
   */
  public panRight(distance: number): void {
    if (this.isAnimating) return;
    
    this.currentOffset = Math.min(this.maxOffset, this.currentOffset + distance);
    this.applyTransform();
  }

  /**
   * Pan timeline to the left by specified distance
   */
  public panLeft(distance: number): void {
    if (this.isAnimating) return;
    
    this.currentOffset = Math.max(this.minOffset, this.currentOffset - distance);
    this.applyTransform();
  }

  /**
   * Get the date at the current position marker (configured via LAYOUT.scroll.currentPositionRatio)
   * Used for calculating counter values
   */
  public getCurrentCenterDate(): Date {
    // Calculate the x-position at the current position marker
    const currentPositionX = this.currentOffset + (this.viewportWidth * LAYOUT.scroll.currentPositionRatio);
    
    // Use D3 scale invert to convert x-position back to date
    const currentDate = this.xScale.invert(currentPositionX);
    
    // Clamp to timeline bounds
    if (currentDate < this.startDate) return this.startDate;
    if (currentDate > this.endDate) return this.endDate;
    
    return currentDate;
  }

  /**
   * Apply CSS transform to pan the timeline
   * Uses negative translateX because we're moving the timeline left to reveal content on the right
   * @param animate - Whether to use CSS transition (default: true)
   */
  private applyTransform(animate: boolean = true): void {
    if (animate) {
      this.isAnimating = true;
    }
    
    // Negative offset moves timeline left (reveals content on right)
    this.container.style.transform = `translateX(-${this.currentOffset}px)`;
  }

  /**
   * Get current offset (for debugging/testing)
   */
  public getCurrentOffset(): number {
    return this.currentOffset;
  }
}

