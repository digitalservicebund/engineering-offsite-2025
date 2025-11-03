#!/usr/bin/env ts-node
/**
 * Milestone Dates Calculator
 * Reads people.json and calculates when cumulative engineer count crossed 5, 10, 25, 50
 * Takes into account both joiners and leavers
 * 
 * Usage: npm run milestone-dates
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalents for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Person {
  name: string;
  joined: string; // ISO date string
  left: string | null; // ISO date string or null
}

interface TimelineEvent {
  date: Date;
  type: 'join' | 'leave';
  personName: string;
}

/**
 * Load people from JSON file
 */
function loadPeople(jsonPath: string): Person[] {
  const content = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(content) as Person[];
}

/**
 * Build timeline events from people data
 */
function buildTimelineEvents(people: Person[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  
  for (const person of people) {
    // Add join event
    events.push({
      date: new Date(person.joined),
      type: 'join',
      personName: person.name,
    });
    
    // Add leave event if person has left
    if (person.left) {
      events.push({
        date: new Date(person.left),
        type: 'leave',
        personName: person.name,
      });
    }
  }
  
  // Sort chronologically (earliest first)
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  return events;
}

/**
 * Find milestone dates when cumulative count crosses thresholds
 */
function findMilestoneDates(
  events: TimelineEvent[],
  milestones: number[]
): Map<number, Date> {
  const milestoneDates = new Map<number, Date>();
  let currentCount = 0;
  
  // Track which milestones we've already found
  const foundMilestones = new Set<number>();
  
  for (const event of events) {
    // Update count based on event type
    if (event.type === 'join') {
      currentCount++;
    } else {
      currentCount--;
    }
    
    // Check if we've crossed any milestones (going upward only)
    for (const milestone of milestones) {
      if (!foundMilestones.has(milestone) && currentCount >= milestone) {
        milestoneDates.set(milestone, event.date);
        foundMilestones.add(milestone);
      }
    }
    
    // Early exit if all milestones found
    if (foundMilestones.size === milestones.length) {
      break;
    }
  }
  
  return milestoneDates;
}

/**
 * Format date as DD.MM.YYYY
 */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Main function
 */
function calculateMilestones(): void {
  const projectRoot = path.resolve(__dirname, '..');
  const peoplePath = path.join(projectRoot, 'input_data', 'people.json');
  
  console.log('📊 Calculating milestone dates...');
  console.log(`   Reading: ${peoplePath}`);
  
  // Check input file exists
  if (!fs.existsSync(peoplePath)) {
    throw new Error(`Missing input file: ${peoplePath}`);
  }
  
  // Load people data
  const people = loadPeople(peoplePath);
  console.log(`   ✓ Loaded ${people.length} people`);
  
  // Build timeline events
  const events = buildTimelineEvents(people);
  console.log(`   ✓ Created ${events.length} timeline events (${events.filter(e => e.type === 'join').length} joins, ${events.filter(e => e.type === 'leave').length} leaves)`);
  
  // Find milestone dates
  const milestones = [5, 10, 25, 50];
  const milestoneDates = findMilestoneDates(events, milestones);
  
  // Output results
  console.log('\n🎯 Milestone Dates:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  for (const milestone of milestones) {
    const date = milestoneDates.get(milestone);
    if (date) {
      console.log(`   ${String(milestone).padStart(2)} engineers: ${formatDate(date)}`);
    } else {
      console.log(`   ${String(milestone).padStart(2)} engineers: Not reached`);
    }
  }
  
  // Show current count if last event is in the past
  const lastEvent = events[events.length - 1];
  const now = new Date();
  if (lastEvent.date < now) {
    // Calculate final count
    let finalCount = 0;
    for (const event of events) {
      if (event.type === 'join') {
        finalCount++;
      } else {
        finalCount--;
      }
    }
    console.log(`\n   Current count: ${finalCount} engineers`);
  }
}

// Run calculation
try {
  calculateMilestones();
} catch (error) {
  console.error('❌ Error calculating milestones:', error);
  process.exit(1);
}

