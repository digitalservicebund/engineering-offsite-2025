/**
 * LanePathGenerator - Generic SVG path generator for lanes with variable width
 *
 * Application layer: Composes domain logic (ActiveCountCalculator) with presentation concerns (SVG path generation).
 * Generic implementation that can be configured for different lane types (people, projects, etc.)
 */

import type * as d3 from 'd3';
import { ActiveCountCalculator } from './active-count-calculator';

interface LaneConfig {
  baseStrokeWidth: number;
  minEventSpacing: number;
  bezierTension: number;
  bezierVerticalTension: number;
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
    // Get timeline points (dates where count changes)
    const timeline = this.activeCount.getTimeline();
    
    // Build array of width change points
    const pathPoints: Array<{ x: number; width: number }> = [];
    
    // Start of timeline
    const startWidth = this.config.baseStrokeWidth;
    pathPoints.push({
      x: xScale(timelineStart),
      width: startWidth,
    });
    
    // Add point at each count change with the NEW width
    for (const point of timeline) {
      const width = this.calculateWidth(point.count);
      pathPoints.push({
        x: xScale(point.date),
        width,
      });
    }
    
    // End of timeline (maintain last width)
    const lastWidth = pathPoints[pathPoints.length - 1].width;
    pathPoints.push({
      x: xScale(timelineEnd),
      width: lastWidth,
    });
    
    // Consolidate points that are too close together (causes jagged curves)
    const consolidatedPoints = this.consolidateClosePoints(
      pathPoints,
      this.config.minEventSpacing
    );
    
    // Construct smooth path with Bezier curves
    return this.buildSmoothPath(consolidatedPoints, centerY);
  }

  /**
   * Consolidate points that are too close together
   * When events happen on nearby dates, the curve becomes jagged.
   * Average nearby points for smoothness.
   */
  private consolidateClosePoints(
    points: Array<{ x: number; width: number }>,
    minSpacing: number
  ): Array<{ x: number; width: number }> {
    if (points.length <= 2) return points;
    
    const result: Array<{ x: number; width: number }> = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const prev = result[result.length - 1];
      const curr = points[i];
      
      const spacing = curr.x - prev.x;
      
      if (spacing < minSpacing && i < points.length - 1) {
        // Too close - merge with previous point by averaging
        // Use the width from current point (it's the more recent state)
        result[result.length - 1] = {
          x: (prev.x + curr.x) / 2, // Average position
          width: curr.width, // Keep current width (accumulated changes)
        };
      } else {
        result.push(curr);
      }
    }
    
    return result;
  }

  /**
   * Build smooth SVG path with cubic Bezier curves
   * Creates organic flowing transitions between width changes
   */
  private buildSmoothPath(
    points: Array<{ x: number; width: number }>,
    centerY: number
  ): string {
    if (points.length < 2) {
      return '';
    }

    // Build top edge with smooth curves
    const topEdge: string[] = [];
    const bottomEdge: string[] = [];

    // Start point (top edge)
    topEdge.push(`M ${points[0].x},${centerY - points[0].width / 2}`);

    // Create smooth curves along top edge
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      const prevY = centerY - prev.width / 2;
      const currY = centerY - curr.width / 2;
      
      // Calculate control points for smooth Bezier S-curve
      const dx = curr.x - prev.x;
      const dy = currY - prevY;
      
      const cp1x = prev.x + dx * this.config.bezierTension;
      const cp1y = prevY + dy * this.config.bezierVerticalTension;
      const cp2x = curr.x - dx * this.config.bezierTension;
      const cp2y = currY - dy * this.config.bezierVerticalTension;
      
      topEdge.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${currY}`);
    }

    // Create smooth curves along bottom edge (reversed)
    for (let i = points.length - 1; i >= 0; i--) {
      const curr = points[i];
      const currY = centerY + curr.width / 2;
      
      if (i === points.length - 1) {
        // First point of bottom edge (continuation from top)
        bottomEdge.push(`L ${curr.x},${currY}`);
      } else {
        const next = points[i + 1];
        const nextY = centerY + next.width / 2;
        
        // Calculate control points for smooth Bezier S-curve
        const dx = next.x - curr.x;
        const dy = currY - nextY;
        
        const cp1x = next.x - dx * this.config.bezierTension;
        const cp1y = nextY + dy * this.config.bezierVerticalTension;
        const cp2x = curr.x + dx * this.config.bezierTension;
        const cp2y = currY - dy * this.config.bezierVerticalTension;
        
        bottomEdge.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${currY}`);
      }
    }

    // Combine and close path
    return [...topEdge, ...bottomEdge, 'Z'].join(' ');
  }
}

