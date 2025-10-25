/**
 * Timeline rendering class
 * Handles SVG creation and lane rendering
 */

import * as d3 from 'd3';
import type { TimelineData, Event } from './types';
import { LAYOUT } from './config';

export class Timeline {
  private readonly data: TimelineData;
  private readonly svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private readonly sortedEvents: Event[];

  private timelineWidth = 0;
  private xScale: d3.ScaleTime<number, number> | null = null;

  constructor(container: HTMLElement, data: TimelineData) {
    this.data = data;
    this.sortedEvents = this.sortEventsByDate(data.events);
    this.svg = this.createSvgElement(container);
  }

  /**
   * Create SVG element and append to container
   */
  private createSvgElement(
    container: HTMLElement
  ): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    return d3
      .select(container)
      .append('svg')
      .attr('width', 0) // Will be set in calculateDimensions
      .attr('height', LAYOUT.viewport.height);
  }

  /**
   * Parse and validate date string in YYYY-MM-DD format
   */
  private parseDate(dateString: string, contextName: string): Date {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (!dateRegex.test(dateString)) {
      throw new Error(
        `Invalid date format for "${contextName}": "${dateString}"\n` +
          `Expected format: YYYY-MM-DD (e.g., 2020-01-15)`
      );
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      throw new Error(
        `Invalid date value for "${contextName}": "${dateString}"\n` +
          `Date does not exist in calendar (e.g., 2020-13-45 is invalid)`
      );
    }

    return date;
  }

  /**
   * Sort events by date in chronological order
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
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();

    this.xScale = d3.scaleTime().domain([startDate, endDate]).range([0, this.timelineWidth]);
  }

  /**
   * Ensure xScale is initialized before use
   */
  private getXScaleOrThrow(): d3.ScaleTime<number, number> {
    if (!this.xScale) {
      throw new Error('Timeline must be rendered before accessing xScale');
    }
    return this.xScale;
  }

  /**
   * Render background rectangle
   */
  private renderBackground(): void {
    this.svg
      .append('rect')
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
    const xScale = this.getXScaleOrThrow();
    const gridGroup = this.svg.append('g').attr('class', 'gridlines');

    // Draw gridlines for each year
    for (let year = this.data.startYear; year <= this.data.endYear; year++) {
      const date = new Date(year, 0, 1);
      const x = xScale(date);

      // Vertical line
      gridGroup
        .append('line')
        .attr('x1', x)
        .attr('x2', x)
        .attr('y1', 0)
        .attr('y2', LAYOUT.viewport.height)
        .attr('stroke', LAYOUT.gridlines.color)
        .attr('stroke-width', LAYOUT.gridlines.strokeWidth);

      // Year label
      gridGroup
        .append('text')
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
   * Render a single horizontal lane
   */
  private renderLane(
    group: d3.Selection<SVGGElement, unknown, null, undefined>,
    className: string,
    yPosition: number,
    strokeWidth: number,
    color: string
  ): void {
    group
      .append('line')
      .attr('class', className)
      .attr('x1', 0)
      .attr('x2', this.timelineWidth)
      .attr('y1', yPosition)
      .attr('y2', yPosition)
      .attr('stroke', color)
      .attr('stroke-width', strokeWidth)
      .attr('stroke-linecap', 'round');
  }

  /**
   * Render the three horizontal lanes
   */
  private renderLanes(): void {
    const lanesGroup = this.svg.append('g').attr('class', 'lanes');

    // Projects lane (top, green)
    this.renderLane(
      lanesGroup,
      'lane-projects',
      LAYOUT.lanes.projects.yPosition,
      LAYOUT.lanes.projects.initialStrokeWidth,
      LAYOUT.lanes.projects.color
    );

    // Events lane (middle, orange)
    this.renderLane(
      lanesGroup,
      'lane-events',
      LAYOUT.lanes.events.yPosition,
      LAYOUT.lanes.events.strokeWidth,
      LAYOUT.lanes.events.color
    );

    // People lane (bottom, blue)
    this.renderLane(
      lanesGroup,
      'lane-people',
      LAYOUT.lanes.people.yPosition,
      LAYOUT.lanes.people.initialStrokeWidth,
      LAYOUT.lanes.people.color
    );
  }

  /**
   * Calculate event marker positioning
   */
  private calculateMarkerPositions(): { laneTopEdge: number; markerTopY: number } {
    const laneTopEdge =
      LAYOUT.lanes.events.yPosition - LAYOUT.lanes.events.strokeWidth / 2;
    const markerTopY = laneTopEdge - LAYOUT.eventMarkers.lineHeight;
    return { laneTopEdge, markerTopY };
  }

  /**
   * Apply label styles to a div element
   */
  private applyLabelStyles(
    div: d3.Selection<d3.BaseType, Event, d3.BaseType, unknown>
  ): void {
    div
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('justify-content', 'flex-end')
      .style('text-align', 'center')
      .style('font-size', `${LAYOUT.eventMarkers.label.fontSize}px`)
      .style('font-family', LAYOUT.eventMarkers.label.fontFamily)
      .style('font-weight', (d) =>
        d.isKeyMoment
          ? LAYOUT.eventMarkers.keyMoment.fontWeight
          : LAYOUT.eventMarkers.regular.fontWeight
      )
      .style('color', LAYOUT.eventMarkers.label.color)
      .style('line-height', '1.2')
      .style('word-wrap', 'break-word')
      .style('overflow-wrap', 'break-word')
      .style('hyphens', 'auto')
      .text((d) => d.name);
  }

  /**
   * Render event markers on the events lane
   * Visual encoding: Vertical lines mark timeline events, with bold text for key moments
   */
  private renderEventMarkers(): void {
    const xScale = this.getXScaleOrThrow();
    const { laneTopEdge, markerTopY } = this.calculateMarkerPositions();

    const markersGroup = this.svg.append('g').attr('class', 'event-markers');

    const eventGroups = markersGroup
      .selectAll<SVGGElement, Event>('g.event-marker')
      .data(this.sortedEvents)
      .join('g')
      .attr('class', 'event-marker');

    // Render vertical marker lines
    eventGroups
      .append('line')
      .attr('class', 'marker-line')
      .attr('x1', (d) => xScale(this.parseDate(d.date, d.name)))
      .attr('x2', (d) => xScale(this.parseDate(d.date, d.name)))
      .attr('y1', laneTopEdge)
      .attr('y2', markerTopY)
      .attr('stroke', LAYOUT.eventMarkers.color)
      .attr('stroke-width', LAYOUT.eventMarkers.lineWidth)
      .attr('stroke-linecap', 'round');

    // Render event name labels using foreignObject for text wrapping
    const labelContainers = eventGroups
      .append('foreignObject')
      .attr('class', (d) =>
        d.isKeyMoment ? 'marker-label-container key-moment' : 'marker-label-container'
      )
      .attr('x', (d) => xScale(this.parseDate(d.date, d.name)) - LAYOUT.eventMarkers.label.maxWidth / 2)
      .attr('y', markerTopY + LAYOUT.eventMarkers.label.offsetY - 100)
      .attr('width', LAYOUT.eventMarkers.label.maxWidth)
      .attr('height', 100);

    const divs = labelContainers.append('xhtml:div');
    this.applyLabelStyles(divs);
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
    this.renderEventMarkers();

    const numYears = this.data.endYear - this.data.startYear;
    console.log(`Timeline rendered: ${this.timelineWidth}px wide (${numYears} years)`);
    console.log(`Events rendered: ${this.sortedEvents.length} markers`);
  }

  // Public getters for ViewportController

  public getTimelineWidth(): number {
    return this.timelineWidth;
  }

  public getXScale(): d3.ScaleTime<number, number> {
    return this.getXScaleOrThrow();
  }

  public getStartDate(): Date {
    return new Date(this.data.startYear, 0, 1);
  }

  public getEndDate(): Date {
    return new Date(this.data.endYear, 11, 31);
  }
}
