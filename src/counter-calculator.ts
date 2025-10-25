/**
 * CounterCalculator - Business logic for calculating active engineers and projects
 * Encapsulates date comparisons and counting logic
 * Operates on parsed data with Date objects (no string parsing needed)
 */

import type { TimelineData, Person, Project } from './types';

export class CounterCalculator {
  private readonly data: TimelineData;

  constructor(data: TimelineData) {
    this.data = data;
  }

  /**
   * Count active engineers at a given date
   */
  public getActiveEngineersAt(date: Date): number {
    return this.data.people.filter((person) => this.isPersonActive(person, date)).length;
  }

  /**
   * Check if a person is active at a given date
   * A person is active if: joined <= date AND (left === null OR left > date)
   */
  private isPersonActive(person: Person, date: Date): boolean {
    // Not yet joined
    if (person.joined > date) {
      return false;
    }

    // Still active (never left)
    if (person.left === null) {
      return true;
    }

    // Check if left date is after the query date
    return person.left > date;
  }

  /**
   * Count active projects at a given date
   * A project is active if: start <= date AND (end === null OR end > date)
   */
  public getActiveProjectsAt(date: Date): number {
    return this.data.projects.filter((project) => this.isProjectActive(project, date))
      .length;
  }

  /**
   * Check if a project is active at a given date
   */
  private isProjectActive(project: Project, date: Date): boolean {
    // Not yet started
    if (project.start > date) {
      return false;
    }

    // Still active (never ended)
    if (project.end === null) {
      return true;
    }

    // Check if end date is after the query date
    return project.end > date;
  }

  /**
   * Extract 4-digit year from a date
   */
  public getYearAt(date: Date): number {
    return date.getFullYear();
  }
}
