/**
 * Type definitions for timeline data model
 */

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
  joined: string;  // ISO date string
  left: string | null;
}

export interface Project {
  id: string;
  name: string;
  start: string;  // ISO date string
  end: string | null;
  widthIncrement: number;
}

export interface Event {
  id: string;
  date: string;  // ISO date string
  name: string;
  isKeyMoment: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  caption: string | null;
}

