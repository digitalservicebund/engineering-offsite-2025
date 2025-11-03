/**
 * LanePathGenerator - Generic SVG path generator for lanes with variable width
 *
 * Application layer: Composes domain logic (ActiveCountCalculator) with presentation concerns (SVG path generation).
 * Generic implementation that can be configured for different lane types (people, projects, etc.)
 */

import type * as d3 from 'd3';
import { ActiveCountCalculator } from './active-count-calculator';

/**
 * Ease-in-out using sine curve
 * Creates an S-curve: slow start → fast middle → slow end
 */
function easeInOutSine(t: number): number {
  return 0.5 * (1 - Math.cos(Math.PI * t));
}

interface LaneConfig {
  baseStrokeWidth: number;
  transitionDurationDays: number; // Duration for width change transitions
  pathSmoothingTension: number; // Bezier control point offset for cosmetic smoothing
}

export class LanePathGenerator<T> {
  private readonly activeCount: ActiveCountCalculator<T>;
  private readonly config: LaneConfig;
  private readonly calculateWidth: (count: number) => number;

  constructor(
    activeCount: ActiveCountCalculator<T>,
    config: LaneConfig,
    calculateWidth: (count: number) => number
  ) {
    this.activeCount = activeCount;
    this.config = config;
    this.calculateWidth = calculateWidth;
  }

  /**
   * Get cumulative count at a specific date
   */
  public getCountAt(date: Date): number {
    return this.activeCount.getCountAt(date);
  }

  /**
   * Calculate stroke width at a specific date using the provided width calculation function
   */
  public getStrokeWidthAt(date: Date): number {
    const count = this.getCountAt(date);
    return this.calculateWidth(count);
  }

  /**
   * Generate SVG path data for the lane as a filled shape
   * The lane grows in thickness from left to right as entities start/end
   * Uses smooth Bezier curves for organic, flowing transitions
   * 
   * @param xScale D3 time scale for x-positioning
   * @param centerY Y-position of lane centerline
   * @param timelineStart Start date of timeline
   * @param timelineEnd End date of timeline
   * @returns SVG path d attribute string
   */
  public generateLanePath(
    xScale: d3.ScaleTime<number, number>,
    centerY: number,
    timelineStart: Date,
    timelineEnd: Date
  ): string {
    // 1. Get timeline events (where counts change)
    const timeline = this.activeCount.getTimeline();
    
    // 2. Build transition descriptors (one per count change event)
    const transitions = this.buildTransitions(timeline, xScale);
    
    // 3. Sample width at regular intervals across timeline
    const pathPoints = this.sampleWidthAcrossTimeline(
      transitions,
      xScale,
      timelineStart,
      timelineEnd
    );
    
    // 4. Build SVG path from sampled points
    return this.buildPathFromSamples(pathPoints, centerY);
  }

  /**
   * Build transition descriptors from timeline events
   * Each transition represents a width change that completes over transitionDurationDays
   */
  private buildTransitions(
    timeline: Array<{ date: Date; count: number; description?: string }>,
    xScale: d3.ScaleTime<number, number>
  ): Array<{ 
    startDate: Date; 
    endDate: Date; 
    startX: number; 
    endX: number; 
    widthDelta: number; 
    widthBefore: number; 
    widthAfter: number;
  }> {
    const transitions: Array<{
      startDate: Date;
      endDate: Date;
      startX: number;
      endX: number;
      widthDelta: number;
      widthBefore: number;
      widthAfter: number;
    }> = [];
    
    // Convert days to milliseconds
    const transitionDurationMs = this.config.transitionDurationDays * 24 * 60 * 60 * 1000;
    
    // Track previous count to calculate deltas
    let previousCount = 0;
    
    for (const event of timeline) {
      const widthBefore = previousCount === 0 
        ? this.config.baseStrokeWidth 
        : this.calculateWidth(previousCount);
      const widthAfter = this.calculateWidth(event.count);
      const widthDelta = widthAfter - widthBefore;
      
      const startDate = event.date;
      const endDate = new Date(event.date.getTime() + transitionDurationMs);
      
      transitions.push({
        startDate,
        endDate,
        startX: xScale(startDate),
        endX: xScale(endDate),
        widthDelta,
        widthBefore,
        widthAfter,
      });
      
      previousCount = event.count;
    }
    
    return transitions;
  }

  /**
   * Sample width at regular intervals across the timeline
   * Handles overlapping transitions by summing their contributions at each sample point
   */
  private sampleWidthAcrossTimeline(
    transitions: Array<{
      startDate: Date;
      endDate: Date;
      startX: number;
      endX: number;
      widthDelta: number;
      widthBefore: number;
      widthAfter: number;
    }>,
    xScale: d3.ScaleTime<number, number>,
    timelineStart: Date,
    timelineEnd: Date
  ): Array<{ x: number; width: number; date: Date }> {
    const pathPoints: Array<{ x: number; width: number; date: Date }> = [];
    
    // Sample interval: 6 hours for smooth Bezier curves
    // (24 hours was too coarse, resulting in visible steps even with Bezier smoothing)
    const sampleIntervalMs = 6 * 60 * 60 * 1000;
    
    // Sample from timeline start to timeline end
    for (
      let currentTime = timelineStart.getTime();
      currentTime <= timelineEnd.getTime();
      currentTime += sampleIntervalMs
    ) {
      const currentDate = new Date(currentTime);
      let totalWidth = this.config.baseStrokeWidth;
      
      // Sum contributions from all transitions
      for (const transition of transitions) {
        const transitionStart = transition.startDate.getTime();
        const transitionEnd = transition.endDate.getTime();
        
        if (currentTime < transitionStart) {
          // Transition hasn't started yet: no contribution
          continue;
        } else if (currentTime >= transitionEnd) {
          // Transition complete: add full delta
          totalWidth += transition.widthDelta;
        } else {
          // Transition in progress: eased interpolation
          const elapsed = currentTime - transitionStart;
          const duration = transitionEnd - transitionStart;
          const progress = Math.min(Math.max(elapsed / duration, 0), 1);
          const easedProgress = easeInOutSine(progress);
          totalWidth += transition.widthDelta * easedProgress;
        }
      }
      
      pathPoints.push({
        x: xScale(currentDate),
        width: totalWidth,
        date: currentDate,
      });
    }
    
    return pathPoints;
  }

  /**
   * Build SVG path from sampled width points with Bezier smoothing
   */
  private buildPathFromSamples(
    points: Array<{ x: number; width: number; date: Date }>,
    centerY: number
  ): string {
    if (points.length < 2) {
      return '';
    }

    const tension = this.config.pathSmoothingTension;
    const topEdge: string[] = [];
    const bottomEdge: string[] = [];

    topEdge.push(`M ${points[0].x},${centerY - points[0].width / 2}`);

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const prevTopY = centerY - prev.width / 2;
      const currTopY = centerY - curr.width / 2;

      const dx = curr.x - prev.x;
      const dy = currTopY - prevTopY;

      const cp1x = prev.x + dx * tension;
      const cp1y = prevTopY + dy * tension;
      const cp2x = curr.x - dx * tension;
      const cp2y = currTopY - dy * tension;

      topEdge.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${currTopY}`);
    }

    for (let i = points.length - 1; i >= 0; i--) {
      const curr = points[i];
      const currBottomY = centerY + curr.width / 2;

      if (i === points.length - 1) {
        bottomEdge.push(`L ${curr.x},${currBottomY}`);
      } else {
        const next = points[i + 1];
        const nextBottomY = centerY + next.width / 2;

        const dx = next.x - curr.x;
        const dy = currBottomY - nextBottomY;

        const cp1x = next.x - dx * tension;
        const cp1y = nextBottomY + dy * tension;
        const cp2x = curr.x + dx * tension;
        const cp2y = currBottomY - dy * tension;

        bottomEdge.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${currBottomY}`);
      }
    }

    return [...topEdge, ...bottomEdge, 'Z'].join(' ');
  }

}

