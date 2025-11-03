/**
 * Data loading and validation
 * Loads raw JSON data and transforms it into parsed data with Date objects
 */

import * as d3 from 'd3';
import type { TimelineData, TimelineDataRaw } from './types';

/**
 * Parse and validate ISO date string (YYYY-MM-DD format)
 * @param dateString - ISO date string to parse
 * @param contextName - Context name for error messages (e.g., "event First Launch", "person Alice")
 * @returns Parsed Date object
 * @throws Error if date format is invalid or date doesn't exist
 */
function parseISODate(dateString: string, contextName: string): Date {
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
 * Load timeline data from JSON file and parse all date strings to Date objects
 * This is the ONLY place where date parsing happens - all downstream code uses Date objects
 */
export async function loadTimelineData(): Promise<TimelineData> {
  const rawData = await d3.json<TimelineDataRaw>('/data/events-timeline/data.json');

  if (!rawData) {
    throw new Error('Failed to load data.json');
  }

  // Basic validation
  if (!rawData.startYear || !rawData.endYear) {
    throw new Error('Missing startYear or endYear');
  }

  if (
    !Array.isArray(rawData.people) ||
    !Array.isArray(rawData.projects) ||
    !Array.isArray(rawData.events)
  ) {
    throw new Error('Invalid data structure: people, projects, and events must be arrays');
  }

  // Transform raw data to parsed data (parse all dates once)
  return {
    startYear: rawData.startYear,
    endYear: rawData.endYear,
    people: rawData.people.map((person) => ({
      id: person.id,
      name: person.name,
      joined: parseISODate(person.joined, `person ${person.name}`),
      left: person.left ? parseISODate(person.left, `person ${person.name}`) : null,
    })),
    projects: rawData.projects.map((project) => ({
      id: project.id,
      name: project.name,
      start: parseISODate(project.start, `project ${project.name}`),
      end: project.end ? parseISODate(project.end, `project ${project.name}`) : null,
      widthIncrement: project.widthIncrement,
    })),
    events: rawData.events.map((event) => ({
      id: event.id,
      date: parseISODate(event.date, `event ${event.name}`),
      name: event.name,
      isKeyMoment: event.isKeyMoment,
      hasPhoto: event.hasPhoto,
      caption: event.caption,
    })),
  };
}
