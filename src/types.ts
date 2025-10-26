/**
 * Type definitions for timeline data model
 */

// Raw JSON data types (as loaded from file, dates are strings)
export interface TimelineDataRaw {
  startYear: number;
  endYear: number;
  people: PersonRaw[];
  projects: ProjectRaw[];
  events: EventRaw[];
}

export interface PersonRaw {
  id: string;
  name: string;
  joined: string; // ISO date string
  left: string | null;
}

export interface ProjectRaw {
  id: string;
  name: string;
  start: string; // ISO date string
  end: string | null;
  widthIncrement: number;
}

export interface EventRaw {
  id: string;
  date: string; // ISO date string
  name: string;
  isKeyMoment: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  caption: string | null;
}

// Parsed data types (dates are Date objects, ready for use)
export interface TimelineData {
  startYear: number;
  endYear: number;
  people: Person[];
  projects: Project[];
  events: Event[];
}

export interface Person {
  id: string;
  name: string;
  joined: Date;
  left: Date | null;
}

export interface Project {
  id: string;
  name: string;
  start: Date;
  end: Date | null;
  widthIncrement: number;
}

export interface Event {
  id: string;
  date: Date;
  name: string;
  isKeyMoment: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  caption: string | null;
}

// Auto-scroll state machine types
export type ScrollState = 'idle' | 'scrolling' | 'paused';
export type ScrollDirection = 'forward' | 'backward';

export interface KeyEventPosition {
  eventId: string;
  eventName: string;
  xPosition: number;
}
