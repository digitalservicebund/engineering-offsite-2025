/**
 * Main entry point for the timeline visualization
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { CounterCalculator } from './counter-calculator';
import { PeopleLaneWidthCalculator } from './people-lane-width-calculator';
import { ActiveCountCalculator } from './active-count-calculator';
import type { Person } from './types';
import { LAYOUT } from './config';
import './style.css';

const CONTAINER_ID = 'timeline-container';
const COUNTER_ENGINEERS_ID = 'counter-engineers';
const COUNTER_PROJECTS_ID = 'counter-projects';
const COUNTER_YEAR_ID = 'counter-year';

/**
 * Get the timeline container element
 */
function getTimelineContainer(): HTMLElement {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) {
    throw new Error(`Container element #${CONTAINER_ID} not found`);
  }
  return container;
}

/**
 * Get counter DOM elements
 */
function getCounterElements(): {
  engineers: HTMLElement;
  projects: HTMLElement;
  year: HTMLElement;
} {
  const engineers = document.getElementById(COUNTER_ENGINEERS_ID);
  const projects = document.getElementById(COUNTER_PROJECTS_ID);
  const year = document.getElementById(COUNTER_YEAR_ID);

  if (!engineers || !projects || !year) {
    throw new Error('Counter elements not found in DOM');
  }

  return { engineers, projects, year };
}

/**
 * Display error message to user
 */
function displayError(error: unknown): void {
  const container = document.getElementById(CONTAINER_ID);
  if (!container) return;

  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  container.innerHTML = `
    <div style="padding: 40px; text-align: center; color: #E74C3C; font-family: sans-serif;">
      <h2>Error Loading Timeline</h2>
      <p>${errorMessage}</p>
    </div>
  `;
}

/**
 * Setup keyboard event listeners for timeline panning
 */
function setupKeyboardControls(viewportController: ViewportController): void {
  const handleKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;

    // Handle Space bar and Right arrow - pan right
    if (key === ' ' || key === 'ArrowRight') {
      event.preventDefault();
      viewportController.panRight(LAYOUT.scroll.panDistance);
      return;
    }

    // Handle Left arrow - pan left
    if (key === 'ArrowLeft') {
      event.preventDefault();
      viewportController.panLeft(LAYOUT.scroll.panDistance);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  console.log('✓ Keyboard controls enabled (Space/Right/Left arrows)');
}

/**
 * Initialize the timeline application
 */
async function init(): Promise<void> {
  try {
    console.log('Loading timeline data...');

    const data = await loadTimelineData();
    console.log('Data loaded:', data);

    const container = getTimelineContainer();
    const counterElements = getCounterElements();

    // Create and render timeline
    const timeline = new Timeline(container, data);
    timeline.render();

    // Create shared people count calculator (used by both counters and lane width)
    const peopleCount = new ActiveCountCalculator<Person>(
      data.people,
      (person) => person.joined,
      (person) => person.left,
      {
        entityName: 'People',
        formatDescription: (person, isStart) => `${person.name} ${isStart ? '↑' : '↓'}`,
      }
    );

    // Create counter calculator (shares people count)
    const counterCalculator = new CounterCalculator(peopleCount, data);

    // Create lane width calculator (shares people count)
    const peopleLaneWidthCalculator = new PeopleLaneWidthCalculator(peopleCount);
    void peopleLaneWidthCalculator; // TODO: Phase 3 - Wire up to update timeline lane width

    // Create counter update callback
    const updateCounters = (date: Date): void => {
      const engineers = counterCalculator.getActiveEngineersAt(date);
      const projects = counterCalculator.getActiveProjectsAt(date);
      const year = counterCalculator.getYearAt(date);

      counterElements.engineers.textContent = `Engineers: ${engineers}`;
      counterElements.projects.textContent = `Projects: ${projects}`;
      counterElements.year.textContent = `Year: ${year}`;
    };

    // Create viewport controller for panning
    const viewportController = new ViewportController(
      container,
      timeline.getTimelineWidth(),
      timeline.getXScale(),
      timeline.getStartDate(),
      timeline.getEndDate(),
      updateCounters
    );

    // Setup keyboard controls
    setupKeyboardControls(viewportController);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
