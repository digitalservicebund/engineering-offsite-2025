/**
 * Timeline rendering class
 * Handles SVG creation and lane rendering
 */

import * as d3 from 'd3';
import type { TimelineData, Event, KeyEventPosition, Person, Project } from './types';
import type { LanePathGenerator } from './lane-path-generator';
import { LAYOUT } from './config';

export class Timeline {
  private readonly data: TimelineData;
  private readonly svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
  private readonly sortedEvents: Event[];
  private readonly peopleLanePathGenerator: LanePathGenerator<Person> | null;
  private readonly projectLanePathGenerator: LanePathGenerator<Project> | null;

  private timelineWidth = 0;
  private xScale: d3.ScaleTime<number, number> | null = null;

  constructor(
    container: HTMLElement,
    data: TimelineData,
    peopleLanePathGenerator?: LanePathGenerator<Person>,
    projectLanePathGenerator?: LanePathGenerator<Project>
  ) {
    this.data = data;
    this.sortedEvents = this.sortEventsByDate(data.events);
    this.peopleLanePathGenerator = peopleLanePathGenerator || null;
    this.projectLanePathGenerator = projectLanePathGenerator || null;
    this.svg = this.createSvgElement(container);
  }

  /**
   * Create SVG element and append to container
   */
  private createSvgElement(
    container: HTMLElement
  ): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    const leftPadding = LAYOUT.laneLabels.leftPadding;
    return d3
      .select(container)
      .append('svg')
      .attr('width', 0) // Will be set in calculateDimensions
      .attr('height', LAYOUT.viewport.height)
      .attr('viewBox', `-${leftPadding} 0 ${leftPadding} ${LAYOUT.viewport.height}`); // Initial viewBox, width updated in calculateDimensions
  }

  /**
   * Sort events by date in chronological order
   */
  private sortEventsByDate(events: Event[]): Event[] {
    return [...events].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Calculate timeline dimensions based on year span
   */
  private calculateDimensions(): void {
    const numYears = this.data.endYear - this.data.startYear;
    this.timelineWidth = numYears * LAYOUT.timeline.pixelsPerYear;
    const leftPadding = LAYOUT.laneLabels.leftPadding;
    
    // Update SVG width and viewBox to include left padding for labels
    // IMPORTANT: width must match viewBox width to avoid scaling
    this.svg
      .attr('width', this.timelineWidth + leftPadding)
      .attr('viewBox', `-${leftPadding} 0 ${this.timelineWidth + leftPadding} ${LAYOUT.viewport.height}`);
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

    // Projects lane (top, green) - rendered as filled path with variable width
    this.renderProjectLane(lanesGroup);

    // Events lane (middle, orange)
    this.renderLane(
      lanesGroup,
      'lane-events',
      LAYOUT.lanes.events.yPosition,
      LAYOUT.lanes.events.strokeWidth,
      LAYOUT.lanes.events.color
    );

    // People lane (bottom, blue) - rendered as filled path with variable width
    this.renderPeopleLane(lanesGroup);

    // Render lane labels
    this.renderLaneLabels();
  }

  /**
   * Render lane labels on the left side of the timeline
   * Labels positioned at negative x values (left of timeline start at x=0)
   * ViewBox adjusted to include this negative space
   */
  private renderLaneLabels(): void {
    const labelsGroup = this.svg.append('g').attr('class', 'lane-labels');

    const labels = [
      { text: 'Projects', y: LAYOUT.lanes.projects.yPosition },
      { text: 'Events', y: LAYOUT.lanes.events.yPosition },
      { text: 'People', y: LAYOUT.lanes.people.yPosition },
    ];

    labelsGroup
      .selectAll('text')
      .data(labels)
      .join('text')
      .attr('class', 'lane-label')
      .attr('x', LAYOUT.laneLabels.offsetX)
      .attr('y', (d) => d.y)
      .text((d) => d.text);
  }

  /**
   * Render the project lane as a filled path with variable width
   * Width grows/shrinks based on active projects over time
   */
  private renderProjectLane(
    lanesGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  ): void {
    if (!this.projectLanePathGenerator) {
      // Fallback: render as simple line if path generator not provided
      this.renderLane(
        lanesGroup,
        'lane-projects',
        LAYOUT.lanes.projects.yPosition,
        LAYOUT.lanes.projects.initialStrokeWidth,
        LAYOUT.lanes.projects.color
      );
      return;
    }

    const xScale = this.getXScaleOrThrow();
    const pathData = this.projectLanePathGenerator.generateLanePath(
      xScale,
      LAYOUT.lanes.projects.yPosition,
      this.getStartDate(),
      this.getEndDate()
    );

    lanesGroup
      .append('path')
      .attr('class', 'lane-projects')
      .attr('d', pathData)
      .attr('fill', LAYOUT.lanes.projects.color)
      .attr('stroke', 'none');
  }

  /**
   * Render the people lane as a filled path with variable width
   * Width grows/shrinks based on team headcount over time
   */
  private renderPeopleLane(
    lanesGroup: d3.Selection<SVGGElement, unknown, null, undefined>
  ): void {
    if (!this.peopleLanePathGenerator) {
      // Fallback: render as simple line if path generator not provided
      this.renderLane(
        lanesGroup,
        'lane-people',
        LAYOUT.lanes.people.yPosition,
        LAYOUT.lanes.people.initialStrokeWidth,
        LAYOUT.lanes.people.color
      );
      return;
    }

    const xScale = this.getXScaleOrThrow();
    const pathData = this.peopleLanePathGenerator.generateLanePath(
      xScale,
      LAYOUT.lanes.people.yPosition,
      this.getStartDate(),
      this.getEndDate()
    );

    lanesGroup
      .append('path')
      .attr('class', 'lane-people')
      .attr('d', pathData)
      .attr('fill', LAYOUT.lanes.people.color)
      .attr('stroke', 'none');
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
   * Apply label class and content to a div element
   */
  private applyLabelStyles(
    div: d3.Selection<d3.BaseType, Event, d3.BaseType, unknown>
  ): void {
    div
      .attr('class', (d) => d.isKeyMoment ? 'event-label key-moment' : 'event-label')
      .text((d) => d.name);
  }

  /**
   * Render event markers on the events lane
   * Visual encoding: Vertical lines mark timeline events, with bold text for key moments
   */
  private renderEventMarkers(): void {
    const xScale = this.getXScaleOrThrow();
    const { laneTopEdge, markerTopY } = this.calculateMarkerPositions();

    // Pre-compute non-overlapping label tiers using simple greedy stacking
    const halfWidth = LAYOUT.eventMarkers.label.maxWidth / 2;
    const minGap = LAYOUT.eventMarkers.label.stack.minHorizontalGap;
    const tierHeight = LAYOUT.eventMarkers.label.stack.tierHeight;
    const maxTiers = LAYOUT.eventMarkers.label.stack.maxTiers;

    // Calculate base label Y position
    // Account for potential text wrapping by using a more generous height estimate
    const estimatedLabelHeight = 30; // Approximate height for 2-3 lines of text
    const baseLabelTopY = markerTopY + LAYOUT.eventMarkers.label.offsetY - estimatedLabelHeight;

    // Track all labels in each tier for proper collision detection
    const labelsByTier: Array<{ left: number; right: number; eventId: string }>[] = [];
    // Map event id to assigned tier index
    const labelTierByEventId = new Map<string, number>();

    for (const ev of this.sortedEvents) {
      const x = xScale(ev.date);
      const left = x - halfWidth;
      const right = x + halfWidth;

      // Find first tier where this label fits without horizontal overlap
      let assignedTier = -1;
      for (let t = 0; t < labelsByTier.length; t++) {
        const tierLabels = labelsByTier[t];
        let hasOverlap = false;
        
        // Check against all existing labels in this tier
        for (const existingLabel of tierLabels) {
          if (!(right + minGap <= existingLabel.left || left >= existingLabel.right + minGap)) {
            hasOverlap = true;
            break;
          }
        }
        
        if (!hasOverlap) {
          assignedTier = t;
          break;
        }
      }
      
      // If none found, open a new tier if allowed
      if (assignedTier === -1) {
        if (labelsByTier.length < maxTiers) {
          labelsByTier.push([]);
          assignedTier = labelsByTier.length - 1;
        } else {
          // Fallback: place in the last tier (may overlap in extreme density)
          assignedTier = labelsByTier.length - 1;
        }
      }
      
      // Add this label to the assigned tier
      labelsByTier[assignedTier].push({ left, right, eventId: ev.id });
      labelTierByEventId.set(ev.id, assignedTier);
    }

    // Render markers first (behind)
    const markersGroup = this.svg.append('g').attr('class', 'event-markers');
    
    markersGroup
      .selectAll<SVGLineElement, Event>('line.marker-line')
      .data(this.sortedEvents)
      .join('line')
      .attr('class', 'marker-line')
      .attr('x1', (d) => xScale(d.date))
      .attr('x2', (d) => xScale(d.date))
      .attr('y1', laneTopEdge)
      .attr('y2', (d) => {
        const tier = labelTierByEventId.get(d.id) ?? 0;
        // Extend per tier while maintaining original margin (offsetY) between marker and label
        return markerTopY - tier * tierHeight;
      })
      .attr('stroke', LAYOUT.eventMarkers.color)
      .attr('stroke-width', LAYOUT.eventMarkers.lineWidth)
      .attr('stroke-linecap', 'round');

    // Render labels second (in front) in separate group
    const labelsGroup = this.svg.append('g').attr('class', 'event-labels');
    
    const labelContainers = labelsGroup
      .selectAll<SVGForeignObjectElement, Event>('foreignObject.marker-label-container')
      .data(this.sortedEvents)
      .join('foreignObject')
      .attr('class', (d) =>
        d.isKeyMoment ? 'marker-label-container key-moment' : 'marker-label-container'
      )
      .attr('x', (d) => xScale(d.date) - LAYOUT.eventMarkers.label.maxWidth / 2)
      .attr('y', (d) => {
        const tier = labelTierByEventId.get(d.id) ?? 0;
        return baseLabelTopY - tier * tierHeight;
      })
      .attr('width', LAYOUT.eventMarkers.label.maxWidth)
      .attr('height', estimatedLabelHeight);

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

  public getSvg(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    return this.svg;
  }

  /**
   * Get x-positions of all key events (where isKeyMoment=true)
   * Pre-calculated for efficient pause detection during auto-scroll
   */
  public getKeyEventPositions(): KeyEventPosition[] {
    const xScale = this.getXScaleOrThrow();
    return this.data.events
      .filter((event) => event.isKeyMoment)
      .map((event) => ({
        eventId: event.id,
        eventName: event.name,
        xPosition: xScale(event.date),
      }))
      .sort((a, b) => a.xPosition - b.xPosition);
  }

  /**
   * Highlight an event marker (visual pause indicator)
   * Adds 'paused' class to trigger pulsing animation
   * @param eventId - ID of event to highlight, or null to clear all highlights
   */
  public highlightEvent(eventId: string | null): void {
    if (eventId === null) {
      // Clear all highlights
      this.svg.selectAll('.event-marker').classed('paused', false);
    } else {
      // Clear previous highlights first
      this.svg.selectAll('.event-marker').classed('paused', false);
      // Add highlight to specific event
      this.svg.select(`.event-marker[data-id="${eventId}"]`).classed('paused', true);
    }
  }
}
