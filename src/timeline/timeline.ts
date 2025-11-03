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
  private readonly contentGroup: d3.Selection<SVGGElement, unknown, null, undefined>;

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
    this.contentGroup = this.svg.append('g').attr('class', 'timeline-content');
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
      .attr('height', LAYOUT.viewport.height)
      .attr('viewBox', `0 0 ${LAYOUT.viewport.width} ${LAYOUT.viewport.height}`); // Placeholder
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
      .attr('viewBox', `0 0 ${this.timelineWidth + leftPadding} ${LAYOUT.viewport.height}`);

    this.contentGroup.attr('transform', `translate(${leftPadding}, 0)`);
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
      .insert('rect', ':first-child')
      .attr('class', 'background')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.timelineWidth + LAYOUT.laneLabels.leftPadding)
      .attr('height', LAYOUT.viewport.height)
      .attr('fill', LAYOUT.background);
  }

  /**
   * Render vertical gridlines at year and month boundaries
   */
  private renderGridlines(): void {
    const xScale = this.getXScaleOrThrow();
    const gridGroup = this.contentGroup.append('g').attr('class', 'gridlines');

    // Month abbreviations for labels
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Draw gridlines for each year and month
    for (let year = this.data.startYear; year <= this.data.endYear; year++) {
      // Major gridline: Year boundary
      const yearDate = new Date(year, 0, 1);
      const yearX = xScale(yearDate);

      gridGroup
        .append('line')
        .attr('class', 'gridline-major')
        .attr('x1', yearX)
        .attr('x2', yearX)
        .attr('y1', 0)
        .attr('y2', LAYOUT.viewport.height)
        .attr('stroke', LAYOUT.gridlines.major.color)
        .attr('stroke-width', LAYOUT.gridlines.major.strokeWidth);

      // Year label
      gridGroup
        .append('text')
        .attr('class', 'gridline-year-label')
        .attr('x', yearX)
        .attr('y', LAYOUT.viewport.height - 20)
        .attr('text-anchor', 'middle')
        .attr('fill', LAYOUT.textColor)
        .attr('font-size', '14px')
        .attr('font-family', 'sans-serif')
        .text(year);

      // Minor gridlines: Monthly boundaries (skip January as it's already the year boundary)
      for (let month = 1; month < 12; month++) {
        const monthDate = new Date(year, month, 1);
        const monthX = xScale(monthDate);

        // Skip if month is beyond timeline end
        if (monthDate > this.getEndDate()) {
          break;
        }

        // Month gridline
        gridGroup
          .append('line')
          .attr('class', 'gridline-minor')
          .attr('x1', monthX)
          .attr('x2', monthX)
          .attr('y1', 0)
          .attr('y2', LAYOUT.viewport.height)
          .attr('stroke', LAYOUT.gridlines.minor.color)
          .attr('stroke-width', LAYOUT.gridlines.minor.strokeWidth)
          .attr('opacity', LAYOUT.gridlines.minor.opacity);

        // Month label
        gridGroup
          .append('text')
          .attr('class', 'gridline-month-label')
          .attr('x', monthX)
          .attr('y', LAYOUT.viewport.height - 20)
          .attr('text-anchor', 'middle')
          .attr('fill', LAYOUT.textColor)
          .attr('font-size', '11px')
          .attr('font-family', 'sans-serif')
          .attr('opacity', 0.7)
          .text(monthAbbr[month]);
      }
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
    const lanesGroup = this.contentGroup.append('g').attr('class', 'lanes');

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
   * Labels are positioned using the lane-label padding to sit left of the translated content
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
      .attr('x', LAYOUT.laneLabels.offsetX + LAYOUT.laneLabels.leftPadding)
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
   * Calculate event marker positioning (both above and below lane)
   */
  private calculateMarkerPositions(): { 
    laneTopEdge: number; 
    laneBottomEdge: number;
    markerTopY: number;
    markerBottomY: number;
  } {
    const laneTopEdge =
      LAYOUT.lanes.events.yPosition - LAYOUT.lanes.events.strokeWidth / 2;
    const laneBottomEdge =
      LAYOUT.lanes.events.yPosition + LAYOUT.lanes.events.strokeWidth / 2;
    const markerTopY = laneTopEdge - LAYOUT.eventMarkers.lineHeight;
    const markerBottomY = laneBottomEdge + LAYOUT.eventMarkers.lineHeight;
    return { laneTopEdge, laneBottomEdge, markerTopY, markerBottomY };
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
   * Check if there's a photo thumbnail near the given x position for a specific tier
   * IMPORTANT: Tier -1 vertically overlaps with thumbnails, but tier -2 and -3 are below them
   */
  private hasNearbyThumbnail(eventX: number, xScale: d3.ScaleTime<number, number>, tier: number): boolean {
    const labelHalfWidth = LAYOUT.eventMarkers.label.maxWidth / 2;  // 90px
    const thumbnailHalfWidth = LAYOUT.photoDisplay.thumbnailSize / 2;  // 50px
    
    // Thumbnails: 414-514px vertical range
    // Tier -1 labels: ~439-479px (overlaps!)
    // Tier -2 labels: ~489-529px (below thumbnails, no overlap!)
    // Tier -3 labels: ~539-579px (well below, no overlap!)
    
    // Only tier -1 needs thumbnail blocking; tier -2 and -3 are vertically clear
    if (tier <= -2) {
      console.log(`  [Thumbnail check] Tier ${tier} is below thumbnails - no blocking needed`);
      return false;
    }
    
    // For tier -1, check horizontal proximity
    const threshold = (labelHalfWidth + thumbnailHalfWidth) * 0.7;  // 98px
    
    console.log(`  [Thumbnail check] eventX=${eventX.toFixed(1)}, threshold=${threshold}px, tier=${tier}`);
    
    for (const ev of this.sortedEvents) {
      if (!ev.hasPhoto) continue;
      const photoX = xScale(ev.date);
      const distance = Math.abs(photoX - eventX);
      if (distance < threshold) {
        console.log(`    → BLOCKED by ${ev.id} "${ev.name}" at ${photoX.toFixed(1)}px (distance: ${distance.toFixed(1)}px < ${threshold}px)`);
        return true;
      }
    }
    console.log(`    → No thumbnails nearby`);
    return false;
  }

  /**
   * Render event markers on the events lane
   * Visual encoding: Vertical lines mark timeline events, with bold text for key moments
   * Key events always render above lane; regular events can render below when crowded
   */
  private renderEventMarkers(): void {
    const xScale = this.getXScaleOrThrow();
    const { laneTopEdge, laneBottomEdge, markerTopY, markerBottomY } = this.calculateMarkerPositions();

    // Pre-compute non-overlapping label tiers using bidirectional greedy stacking
    const halfWidth = LAYOUT.eventMarkers.label.maxWidth / 2;
    const minGap = LAYOUT.eventMarkers.label.stack.minHorizontalGap;
    const tierHeight = LAYOUT.eventMarkers.label.stack.tierHeight;
    const maxTiersAbove = LAYOUT.eventMarkers.label.stack.maxTiers;
    const maxTiersBelow = LAYOUT.eventMarkers.label.stack.maxTiersBelow;

    // Calculate base label Y positions (above and below)
    const labelHeight = LAYOUT.eventMarkers.label.height;
    const baseLabelTopY = markerTopY + LAYOUT.eventMarkers.label.offsetY - labelHeight;
    const baseLabelBottomY = markerBottomY - LAYOUT.eventMarkers.label.offsetY;

    // Track all labels by tier (positive = above, negative = below)
    // Tier 0 = closest above lane, Tier -1 = closest below lane
    const labelsByTier = new Map<number, Array<{ left: number; right: number; eventId: string }>>();
    const labelTierByEventId = new Map<string, number>();

    // Helper: check if label fits in tier without overlap
    const canFitInTier = (tier: number, left: number, right: number): boolean => {
      const tierLabels = labelsByTier.get(tier);
      if (!tierLabels) return true;
      
      for (const existing of tierLabels) {
        if (!(right + minGap <= existing.left || left >= existing.right + minGap)) {
          return false;
        }
      }
      return true;
    };

    // Helper: assign label to tier
    const assignToTier = (tier: number, left: number, right: number, eventId: string): void => {
      if (!labelsByTier.has(tier)) {
        labelsByTier.set(tier, []);
      }
      labelsByTier.get(tier)!.push({ left, right, eventId });
      labelTierByEventId.set(eventId, tier);
    };

    // Separate key events and regular events
    const keyEvents = this.sortedEvents.filter(ev => ev.isKeyMoment);
    const regularEvents = this.sortedEvents.filter(ev => !ev.isKeyMoment);

    // FIRST PASS: Assign key events (always above, tiers 0+)
    for (const ev of keyEvents) {
      const x = xScale(ev.date);
      const left = x - halfWidth;
      const right = x + halfWidth;

      // Try tiers 0 through maxTiersAbove-1
      let assigned = false;
      for (let tier = 0; tier < maxTiersAbove; tier++) {
        if (canFitInTier(tier, left, right)) {
          assignToTier(tier, left, right, ev.id);
          assigned = true;
          break;
        }
      }
      
      // Fallback: place in last above tier (may overlap)
      if (!assigned) {
        assignToTier(maxTiersAbove - 1, left, right, ev.id);
      }
    }

    // SECOND PASS: Assign regular events (can use both above and below)
    for (const ev of regularEvents) {
      const x = xScale(ev.date);
      const left = x - halfWidth;
      const right = x + halfWidth;

      console.log(`[Event ${ev.id} "${ev.name}"]`);
      console.log(`  - Position: ${x.toFixed(1)}px`);
      console.log(`  - Tier 0 available: ${canFitInTier(0, left, right)}`);

      let assigned = false;

      // Try tier 0 first (closest above)
      if (canFitInTier(0, left, right)) {
        assignToTier(0, left, right, ev.id);
        assigned = true;
        console.log(`  ✓ ASSIGNED TO TIER 0`);
      } else { 
        // Crowded (tier 0 full): consider below-lane placement
        // Check each below-lane tier individually for thumbnail conflicts
        console.log(`  - Trying below-lane tiers...`);
        for (let tier = -1; tier >= -maxTiersBelow; tier--) {
          const fits = canFitInTier(tier, left, right);
          const hasThumbnail = this.hasNearbyThumbnail(x, xScale, tier);
          console.log(`    - Tier ${tier}: ${fits ? 'space available' : 'blocked'}, thumbnail conflict: ${hasThumbnail}`);
          if (fits && !hasThumbnail) {
            assignToTier(tier, left, right, ev.id);
            assigned = true;
            console.log(`  ✓ ASSIGNED TO TIER ${tier}`);
            break;
          }
        }
        
        // If still not assigned, try remaining above tiers: 1, 2, 3, etc.
        if (!assigned) {
          console.log(`  - Trying remaining above tiers...`);
          for (let tier = 1; tier < maxTiersAbove; tier++) {
            const fits = canFitInTier(tier, left, right);
            console.log(`    - Tier ${tier}: ${fits ? 'AVAILABLE' : 'blocked'}`);
            if (fits) {
              assignToTier(tier, left, right, ev.id);
              assigned = true;
              console.log(`  ✓ ASSIGNED TO TIER ${tier}`);
              break;
            }
          }
        }
      }
      
      // Ultimate fallback: place in last available tier
      // Prefer tier -3 (below thumbnails) over tier 3 (high above)
      if (!assigned) {
        const hasThumbnailAtTier3Below = this.hasNearbyThumbnail(x, xScale, -maxTiersBelow);
        const fallbackTier = hasThumbnailAtTier3Below ? (maxTiersAbove - 1) : (-maxTiersBelow);
        assignToTier(fallbackTier, left, right, ev.id);
        console.log(`  ⚠ FALLBACK TO TIER ${fallbackTier}`);
      }
    }

    // Log tier distribution summary
    console.log('\n=== TIER ASSIGNMENT SUMMARY ===');
    const tierCounts = new Map<number, number>();
    for (const [, tier] of labelTierByEventId.entries()) {
      tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
    }
    const sortedTiers = Array.from(tierCounts.keys()).sort((a, b) => b - a);
    for (const tier of sortedTiers) {
      const location = tier >= 0 ? 'above' : 'below';
      console.log(`  Tier ${tier.toString().padStart(2)} (${location}): ${tierCounts.get(tier)} events`);
    }
    console.log('================================\n');

    // Render markers first (behind)
    const markersGroup = this.contentGroup.append('g').attr('class', 'event-markers');
    
    markersGroup
      .selectAll<SVGLineElement, Event>('line.marker-line')
      .data(this.sortedEvents)
      .join('line')
      .attr('class', 'marker-line')
      .attr('x1', (d) => xScale(d.date))
      .attr('x2', (d) => xScale(d.date))
      .attr('y1', (d) => {
        const tier = labelTierByEventId.get(d.id) ?? 0;
        // Above lane: extend from top edge, below lane: extend from bottom edge
        return tier >= 0 ? laneTopEdge : laneBottomEdge;
      })
      .attr('y2', (d) => {
        const tier = labelTierByEventId.get(d.id) ?? 0;
        // Above: y2 = markerTopY - tier * tierHeight (extends up)
        // Below: y2 = markerBottomY + abs(tier) * tierHeight (extends down)
        if (tier >= 0) {
          return markerTopY - tier * tierHeight;
        } else {
          return markerBottomY + Math.abs(tier) * tierHeight;
        }
      })
      .attr('stroke', LAYOUT.eventMarkers.color)
      .attr('stroke-width', LAYOUT.eventMarkers.lineWidth)
      .attr('stroke-linecap', 'round');

    // Render labels second (in front) in separate group
    const labelsGroup = this.contentGroup.append('g').attr('class', 'event-labels');
    
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
        // Above: y = baseLabelTopY - tier * tierHeight
        // Below: y = baseLabelBottomY + abs(tier) * tierHeight
        if (tier >= 0) {
          return baseLabelTopY - tier * tierHeight;
        } else {
          return baseLabelBottomY + Math.abs(tier) * tierHeight;
        }
      })
      .attr('width', LAYOUT.eventMarkers.label.maxWidth)
      .attr('height', labelHeight);

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

  // getSvg() removed: unused public API

  public getContentGroup(): d3.Selection<SVGGElement, unknown, null, undefined> {
    return this.contentGroup;
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

  // highlightEvent() removed: targeted non-existent elements and was a no-op
}

