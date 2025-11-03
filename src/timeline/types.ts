/**
 * Type definitions for timeline data model
 */

import type * as d3 from 'd3';

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
  caption: string | null;
  // Note: caption falls back to event name if null
}

// Auto-scroll state machine types
export type ScrollState = 'idle' | 'scrolling' | 'paused';

export interface KeyEventPosition {
  eventId: string;
  eventName: string;
  xPosition: number;
}

// Particle animation types (generic for people, projects, etc.)
export interface ParticleAnimation {
  id: string; // Unique identifier (e.g., 'particle-Alice-join' or 'particle-Platform v1-start')
  entityName: string; // Entity name (person.name or project.name) - serves as unique ID within entity type
  joinDate: Date; // Generic trigger date (person.joined or project.start)
  joinX: number; // x-position where particle should merge (trigger date position)
  spawnX: number; // x-position where particle spawns (joinX - pixelsPerYear/3)
  laneEdgeY: number; // y-position of lane edge at trigger date (bottom for people, top for projects)
  hasSpawned: boolean; // true when particle element created
  isComplete: boolean; // true when animation finished and cleaned up
  element?: d3.Selection<SVGGElement, unknown, null, undefined>; // D3 selection reference for animation
  animationStartTime?: number; // High-res timestamp from performance.now() when animation started
  animationDuration?: number; // Total animation duration in ms
  startTransform?: { x: number; y: number }; // Initial offset position
  spawnViewportX?: number; // Viewport X position when particle spawned (for distance-based X interpolation)
}

// Photo display state tracking
export interface PhotoState {
  eventId: string;
  eventName: string; // For caption fallback when caption is null
  caption: string | null;
  markerX: number; // x-position of event marker for thumbnail anchoring
  markerY: number; // y-position of event marker for thumbnail anchoring
  phase: 'loading' | 'fullscreen' | 'transitioning' | 'thumbnail';
  photoElement?: HTMLElement; // Reference to photo element (re-used for both overlay and thumbnail)
}
