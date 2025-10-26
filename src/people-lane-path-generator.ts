/**
 * PeopleLanePathGenerator - Generates SVG path for people lane with variable width
 *
 * Application layer: Composes domain logic (ActiveCountCalculator) with presentation concerns (SVG path generation).
 */

import type * as d3 from 'd3';
import type { Person } from './types';
import { LAYOUT } from './config';
import { ActiveCountCalculator } from './active-count-calculator';

export class PeopleLanePathGenerator {
  private readonly activeCount: ActiveCountCalculator<Person>;

  constructor(activeCount: ActiveCountCalculator<Person>) {
    // Inject people count calculator (shared with CounterCalculator)
    this.activeCount = activeCount;
  }

  /**
   * Get cumulative headcount at a specific date
   */
  public getHeadcountAt(date: Date): number {
    return this.activeCount.getCountAt(date);
  }

  /**
   * Calculate stroke width at a specific date
   * Formula: baseStrokeWidth + (headcount × pixelsPerPerson)
   */
  public getStrokeWidthAt(date: Date): number {
    const headcount = this.getHeadcountAt(date);
    return (
      LAYOUT.lanes.people.baseStrokeWidth + headcount * LAYOUT.lanes.people.pixelsPerPerson
    );
  }

  /**
   * Generate SVG path data for the people lane as a filled shape
   * The lane grows in thickness from left to right as people join/leave
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
    // Get timeline points (dates where headcount changes)
    const timeline = this.activeCount.getTimeline();
    
    // Build array of width change points
    const pathPoints: Array<{ x: number; width: number }> = [];
    
    // Start of timeline (before any joins)
    const startWidth = LAYOUT.lanes.people.baseStrokeWidth;
    pathPoints.push({
      x: xScale(timelineStart),
      width: startWidth,
    });
    
    // Add point at each headcount change with the NEW width
    for (const point of timeline) {
      const width = LAYOUT.lanes.people.baseStrokeWidth + 
                    point.count * LAYOUT.lanes.people.pixelsPerPerson;
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
      LAYOUT.lanes.people.minEventSpacing
    );
    
    // Construct smooth path with Bezier curves
    return this.buildSmoothPath(consolidatedPoints, centerY);
  }

  /**
   * Consolidate points that are too close together
   * When someone leaves on month-end and someone joins on month-start,
   * the curve becomes jagged. Average nearby points for smoothness.
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
      
      const cp1x = prev.x + dx * LAYOUT.lanes.people.bezierTension;
      const cp1y = prevY + dy * LAYOUT.lanes.people.bezierVerticalTension;
      const cp2x = curr.x - dx * LAYOUT.lanes.people.bezierTension;
      const cp2y = currY - dy * LAYOUT.lanes.people.bezierVerticalTension;
      
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
        
        const cp1x = next.x - dx * LAYOUT.lanes.people.bezierTension;
        const cp1y = nextY + dy * LAYOUT.lanes.people.bezierVerticalTension;
        const cp2x = curr.x + dx * LAYOUT.lanes.people.bezierTension;
        const cp2y = currY - dy * LAYOUT.lanes.people.bezierVerticalTension;
        
        bottomEdge.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${currY}`);
      }
    }

    // Combine and close path
    return [...topEdge, ...bottomEdge, 'Z'].join(' ');
  }
}

