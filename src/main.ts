/**
 * Main entry point for the timeline visualization
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { CounterCalculator } from './counter-calculator';
import { PeopleLanePathGenerator } from './people-lane-path-generator';
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
 * Setup keyboard event listeners for auto-scroll state machine
 */
function setupKeyboardControls(
  viewportController: ViewportController,
  timeline: Timeline
): void {
  const handleKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;
    const currentState = viewportController.getScrollState();
    const currentDirection = viewportController.getScrollDirection();

    // Handle Space bar - state-aware behavior
    if (key === ' ') {
      event.preventDefault();

      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll('forward');
        timeline.highlightEvent(null); // Clear any highlights
      } else if (currentState === 'scrolling') {
        // Toggle pause (manual pause)
        viewportController.togglePause();
        // Note: Manual pause doesn't highlight event (pausedAtEventId will be null)
      } else if (currentState === 'paused') {
        // Resume auto-scroll in current direction
        timeline.highlightEvent(null); // Clear highlight
        viewportController.resumeAutoScroll();
      }
      return;
    }

    // Handle Right arrow - always forward
    if (key === 'ArrowRight') {
      event.preventDefault();

      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll('forward');
        timeline.highlightEvent(null);
      } else if (currentState === 'paused') {
        // Resume auto-scroll forward (change direction if needed)
        timeline.highlightEvent(null);
        if (currentDirection === 'backward') {
          // Switch direction: stop and restart forward
          viewportController.stopAutoScroll();
          viewportController.startAutoScroll('forward');
        } else {
          viewportController.resumeAutoScroll();
        }
      } else if (currentState === 'scrolling' && currentDirection === 'backward') {
        // Reverse to forward direction
        viewportController.stopAutoScroll();
        viewportController.startAutoScroll('forward');
      }
      // If already scrolling forward, no-op
      return;
    }

    // Handle Left arrow - always backward
    if (key === 'ArrowLeft') {
      event.preventDefault();

      if (currentState === 'idle') {
        // Start auto-scroll backward
        viewportController.startAutoScroll('backward');
        timeline.highlightEvent(null);
      } else if (currentState === 'paused') {
        // Resume auto-scroll backward (change direction if needed)
        timeline.highlightEvent(null);
        if (currentDirection === 'forward') {
          // Switch direction: stop and restart backward
          viewportController.stopAutoScroll();
          viewportController.startAutoScroll('backward');
        } else {
          viewportController.resumeAutoScroll();
        }
      } else if (currentState === 'scrolling' && currentDirection === 'forward') {
        // Reverse to backward direction
        viewportController.stopAutoScroll();
        viewportController.startAutoScroll('backward');
      }
      // If already scrolling backward, no-op
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  console.log('✓ Auto-scroll keyboard controls enabled (Space/Right/Left arrows)');
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

    // Create shared people count calculator (used by both counters and lane rendering)
    const peopleCount = new ActiveCountCalculator<Person>(
      data.people,
      (person) => person.joined,
      (person) => person.left,
      {
        entityName: 'People',
        formatDescription: (person, isStart) => `${person.name} ${isStart ? '↑' : '↓'}`,
      }
    );

    // Create lane path generator (for people lane path generation)
    const peopleLanePathGenerator = new PeopleLanePathGenerator(peopleCount);

    // Create and render timeline (with dynamic people lane)
    const timeline = new Timeline(container, data, peopleLanePathGenerator);
    timeline.render();

    // Create counter calculator (shares people count)
    const counterCalculator = new CounterCalculator(peopleCount, data);

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
    setupKeyboardControls(viewportController, timeline);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
