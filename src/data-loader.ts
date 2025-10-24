/**
 * Data loading and validation
 */

import * as d3 from 'd3';
import type { TimelineData } from './types';

/**
 * Load timeline data from JSON file
 */
export async function loadTimelineData(): Promise<TimelineData> {
  const data = await d3.json<TimelineData>('/assets/data.json');
  
  if (!data) {
    throw new Error('Failed to load data.json');
  }
  
  // Basic validation
  if (!data.startYear || !data.endYear) {
    throw new Error('Missing startYear or endYear');
  }
  
  if (!Array.isArray(data.people) || !Array.isArray(data.projects) || !Array.isArray(data.events)) {
    throw new Error('Invalid data structure: people, projects, and events must be arrays');
  }
  
  return data;
}

