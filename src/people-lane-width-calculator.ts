/**
 * PeopleLaneWidthCalculator - Calculates lane width based on active headcount
 *
 * Application layer: Composes domain logic (ActiveCountCalculator) with presentation concerns (stroke width formula).
 */

import type { Person } from './types';
import { LAYOUT } from './config';
import { ActiveCountCalculator } from './active-count-calculator';

export class PeopleLaneWidthCalculator {
  private readonly activeCount: ActiveCountCalculator<Person>;

  constructor(activeCount: ActiveCountCalculator<Person>) {
    // Inject people count calculator (shared with CounterCalculator)
    this.activeCount = activeCount;
  }

  /**
   * Get cumulative headcount at a specific date
   */
  public getHeadcountAt(date: Date): number {
    return this.activeCount.getCountAt(date);
  }

  /**
   * Calculate stroke width at a specific date
   * Formula: baseStrokeWidth + (headcount × pixelsPerPerson)
   */
  public getStrokeWidthAt(date: Date): number {
    const headcount = this.getHeadcountAt(date);
    return (
      LAYOUT.lanes.people.baseStrokeWidth + headcount * LAYOUT.lanes.people.pixelsPerPerson
    );
  }
}

