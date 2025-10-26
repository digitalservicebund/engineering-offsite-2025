/**
 * CounterCalculator - Orchestrates counter displays for the UI
 * Application layer: Composes domain logic (ActiveCountCalculator) for multiple entity types
 */

import type { TimelineData, Person, Project } from './types';
import { ActiveCountCalculator } from './active-count-calculator';

export class CounterCalculator {
  private readonly peopleCount: ActiveCountCalculator<Person>;
  private readonly projectCount: ActiveCountCalculator<Project>;

  constructor(
    peopleCount: ActiveCountCalculator<Person>,
    data: TimelineData
  ) {
    // Inject people count calculator (shared with PeopleLaneWidthCalculator)
    this.peopleCount = peopleCount;

    // Create project count calculator (no sharing yet)
    this.projectCount = new ActiveCountCalculator(
      data.projects,
      (project) => project.start,
      (project) => project.end
      // No logging - counters don't need detailed timeline logs
    );
  }

  /**
   * Count active engineers at a given date
   * Now O(log n) instead of O(n) - performance optimized!
   */
  public getActiveEngineersAt(date: Date): number {
    return this.peopleCount.getCountAt(date);
  }

  /**
   * Count active projects at a given date
   * Now O(log n) instead of O(n) - performance optimized!
   */
  public getActiveProjectsAt(date: Date): number {
    return this.projectCount.getCountAt(date);
  }

  /**
   * Extract 4-digit year from a date
   */
  public getYearAt(date: Date): number {
    return date.getFullYear();
  }
}
