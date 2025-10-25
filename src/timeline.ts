/**
 * Timeline rendering class
 * Handles SVG creation and lane rendering
 */

import * as d3 from 'd3';
import type { TimelineData, Event } from './types';
import { LAYOUT } from './config';

export class Timeline {
  private data: TimelineData;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private timelineWidth: number = 0;
  private xScale: d3.ScaleTime<number, number> | null = null;
  private sortedEvents: Event[] = [];

  constructor(container: HTMLElement, data: TimelineData) {
    this.data = data;
    
    // Sort events chronologically for rendering
    this.sortedEvents = this.sortEventsByDate(data.events);
    
    // Create SVG element
    this.svg = d3.select(container)
      .append('svg')
      .attr('width', 0)  // Will be set in calculateDimensions
      .attr('height', LAYOUT.viewport.height);
  }

  /**
   * Parse and validate date string in YYYY-MM-DD format
   * Throws error if date is invalid
   */
  private parseDate(dateString: string, eventName: string): Date {
    // Enforce exact YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      throw new Error(
        `Invalid date format for event "${eventName}": "${dateString}"\n` +
        `Expected format: YYYY-MM-DD (e.g., 2020-01-15)`
      );
    }

    const date = new Date(dateString);
    
    // Check if date is valid (not NaN)
    if (isNaN(date.getTime())) {
      throw new Error(
        `Invalid date value for event "${eventName}": "${dateString}"\n` +
        `Date does not exist in calendar (e.g., 2020-13-45 is invalid)`
      );
    }

    return date;
  }

  /**
   * Sort events by date in chronological order
   * Throws error if any event has invalid date
   */
  private sortEventsByDate(events: Event[]): Event[] {
    return [...events].sort((a, b) => {
      const dateA = this.parseDate(a.date, a.name);
      const dateB = this.parseDate(b.date, b.name);
      return dateA.getTime() - dateB.getTime();
    });
  }

  /**
   * Calculate timeline dimensions based on year span
   */
  private calculateDimensions(): void {
    const numYears = this.data.endYear - this.data.startYear;
    this.timelineWidth = numYears * LAYOUT.timeline.pixelsPerYear;
    this.svg.attr('width', this.timelineWidth);
  }

  /**
   * Create D3 time scale for x-axis positioning
   */
  private createScales(): void {
    const startDate = new Date(this.data.startYear, 0, 1);
    const endDate = new Date(this.data.endYear, 11, 31);
    
    this.xScale = d3.scaleTime()
      .domain([startDate, endDate])
      .range([0, this.timelineWidth]);
  }

  /**
   * Render background rectangle
   */
  private renderBackground(): void {
    this.svg.append('rect')
      .attr('class', 'background')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.timelineWidth)
      .attr('height', LAYOUT.viewport.height)
      .attr('fill', LAYOUT.background);
  }

  /**
   * Render vertical gridlines at year boundaries
   */
  private renderGridlines(): void {
    if (!this.xScale) return;

    const gridGroup = this.svg.append('g')
      .attr('class', 'gridlines');

    // Draw gridlines for each year
    for (let year = this.data.startYear; year <= this.data.endYear; year++) {
      const date = new Date(year, 0, 1);
      const x = this.xScale(date);

      // Vertical line
      gridGroup.append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', LAYOUT.viewport.height)
        .attr('stroke', LAYOUT.gridlines.color)
        .attr('stroke-width', LAYOUT.gridlines.strokeWidth);

      // Year label
      gridGroup.append('text')
        .attr('x', x)
        .attr('y', LAYOUT.viewport.height - 20)
        .attr('text-anchor', 'middle')
        .attr('fill', LAYOUT.textColor)
        .attr('font-size', '14px')
        .attr('font-family', 'sans-serif')
        .text(year);
    }
  }

  /**
   * Render the three horizontal lanes
   */
  private renderLanes(): void {
    const lanesGroup = this.svg.append('g')
      .attr('class', 'lanes');

    // Projects lane (top, green)
    lanesGroup.append('line')
      .attr('class', 'lane-projects')
      .attr('x1', 0)
      .attr('x2', this.timelineWidth)
      .attr('y1', LAYOUT.lanes.projects.yPosition)
      .attr('y2', LAYOUT.lanes.projects.yPosition)
      .attr('stroke', LAYOUT.lanes.projects.color)
      .attr('stroke-width', LAYOUT.lanes.projects.initialStrokeWidth)
      .attr('stroke-linecap', 'round');

    // Events lane (middle, orange)
    lanesGroup.append('line')
      .attr('class', 'lane-events')
      .attr('x1', 0)
      .attr('x2', this.timelineWidth)
      .attr('y1', LAYOUT.lanes.events.yPosition)
      .attr('y2', LAYOUT.lanes.events.yPosition)
      .attr('stroke', LAYOUT.lanes.events.color)
      .attr('stroke-width', LAYOUT.lanes.events.strokeWidth)
      .attr('stroke-linecap', 'round');

    // People lane (bottom, blue)
    lanesGroup.append('line')
      .attr('class', 'lane-people')
      .attr('x1', 0)
      .attr('x2', this.timelineWidth)
      .attr('y1', LAYOUT.lanes.people.yPosition)
      .attr('y2', LAYOUT.lanes.people.yPosition)
      .attr('stroke', LAYOUT.lanes.people.color)
      .attr('stroke-width', LAYOUT.lanes.people.initialStrokeWidth)
      .attr('stroke-linecap', 'round');
  }

  /**
   * Main render method - orchestrates all rendering steps
   */
  public render(): void {
    this.calculateDimensions();
    this.createScales();
    this.renderBackground();
    this.renderGridlines();
    this.renderLanes();
    
    console.log(`Timeline rendered: ${this.timelineWidth}px wide (${this.data.endYear - this.data.startYear} years)`);
  }
}

