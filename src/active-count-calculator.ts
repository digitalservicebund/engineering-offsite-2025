/**
 * ActiveCountCalculator - Generic domain logic for counting active entities at any date
 *
 * Precomputes a timeline of cumulative counts for efficient O(log n) lookups.
 * Generic over entity type T - works for People, Projects, or any entity with start/end dates.
 *
 * Design: Core domain logic separated from presentation concerns.
 */

import * as d3 from 'd3';

interface TimelinePoint {
  date: Date;
  count: number;
  description?: string; // Optional, for logging
}

interface TimelineEvent {
  date: Date;
  delta: number; // +1 for starts, -1 for ends
  description: string; // For logging
}

interface LoggingConfig<T> {
  entityName: string; // e.g., "People", "Projects"
  formatDescription: (entity: T, isStart: boolean) => string; // e.g., "Alice ↑" or "Carol ↓"
}

export class ActiveCountCalculator<T> {
  private timeline: TimelinePoint[] = [];
  private readonly bisector = d3.bisector((d: TimelinePoint) => d.date).left;

  constructor(
    entities: T[],
    getEntityStart: (entity: T) => Date,
    getEntityEnd: (entity: T) => Date | null,
    loggingConfig?: LoggingConfig<T>
  ) {
    this.buildTimeline(entities, getEntityStart, getEntityEnd, loggingConfig);
  }

  /**
   * Precompute cumulative count at all significant dates
   * Algorithm: Collect all start/end events, aggregate same-day events, sort, and calculate cumulative counts
   */
  private buildTimeline(
    entities: T[],
    getEntityStart: (entity: T) => Date,
    getEntityEnd: (entity: T) => Date | null,
    loggingConfig?: LoggingConfig<T>
  ): void {
    // Step 1 & 2: Collect all start and end events with deltas
    const eventMap = new Map<string, TimelineEvent>();

    for (const entity of entities) {
      // Add start event (+1)
      const startDate = getEntityStart(entity);
      this.addEvent(
        eventMap,
        startDate,
        1,
        loggingConfig ? loggingConfig.formatDescription(entity, true) : ''
      );

      // Add end event (-1) if entity has ended
      const endDate = getEntityEnd(entity);
      if (endDate !== null) {
        this.addEvent(
          eventMap,
          endDate,
          -1,
          loggingConfig ? loggingConfig.formatDescription(entity, false) : ''
        );
      }
    }

    // Step 3: Sort events chronologically
    const sortedEvents = Array.from(eventMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    // Step 4: Calculate cumulative counts
    let cumulativeCount = 0;
    this.timeline = sortedEvents.map((event) => {
      cumulativeCount += event.delta;
      return {
        date: event.date,
        count: cumulativeCount,
        description: event.description,
      };
    });

    // Log if config provided
    if (loggingConfig) {
      this.logTimeline(loggingConfig.entityName, this.timeline);
    }
  }

  /**
   * Add or update an event in the event map
   * Aggregates multiple events on the same date
   */
  private addEvent(
    eventMap: Map<string, TimelineEvent>,
    date: Date,
    delta: number,
    description: string
  ): void {
    const key = date.toISOString();

    if (!eventMap.has(key)) {
      eventMap.set(key, { date, delta: 0, description: '' });
    }

    const event = eventMap.get(key)!;
    event.delta += delta;
    if (description) {
      event.description = event.description
        ? `${event.description}, ${description}`
        : description;
    }
  }

  /**
   * Get cumulative count at a specific date using binary search
   * Returns the count at the largest date <= query date
   */
  public getCountAt(date: Date): number {
    // Edge case: date before timeline start
    if (this.timeline.length === 0 || date < this.timeline[0].date) {
      return 0;
    }

    // Edge case: date after all events
    const lastPoint = this.timeline[this.timeline.length - 1];
    if (date >= lastPoint.date) {
      return lastPoint.count;
    }

    // Binary search for largest date <= query date
    // bisector.left returns the insertion point, so we need the element before it
    const index = this.bisector(this.timeline, date);

    // If index is 0, date is before first event (already handled above)
    // Otherwise, return count from previous event
    if (index === 0) {
      return 0;
    }

    return this.timeline[index - 1].count;
  }

  /**
   * Log precomputed timeline for validation
   */
  private logTimeline(entityName: string, timeline: TimelinePoint[]): void {
    console.log(`${entityName} count timeline: ${timeline.length} events`);

    if (timeline.length === 0) {
      console.log('  (no events - empty timeline)');
      return;
    }

    // Log each event with previous count → new count
    let previousCount = 0;
    for (const point of timeline) {
      const dateStr = point.date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      console.log(`  ${dateStr}: ${previousCount} → ${point.count} (${point.description})`);
      previousCount = point.count;
    }
  }
}

