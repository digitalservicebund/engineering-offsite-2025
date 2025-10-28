/**
 * Main entry point for the timeline visualization
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { CounterCalculator } from './counter-calculator';
import { PeopleLanePathGenerator } from './people-lane-path-generator';
import { ActiveCountCalculator } from './active-count-calculator';
import { ParticleAnimationController } from './particle-animation-controller';
import { LAYOUT } from './config';
import type { Person } from './types';
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
  timeline: Timeline,
  particleAnimationController: ParticleAnimationController
): void {
  const handleKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;
    const currentState = viewportController.getScrollState();

    // Handle Space bar - state-aware behavior
    if (key === ' ') {
      event.preventDefault();

      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll();
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

    // Handle Right arrow - start or resume forward scroll
    if (key === 'ArrowRight') {
      event.preventDefault();

      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll();
        timeline.highlightEvent(null);
      } else if (currentState === 'paused') {
        // Resume auto-scroll forward
        timeline.highlightEvent(null);
        viewportController.resumeAutoScroll();
      }
      // If already scrolling forward, no-op
      return;
    }

    // Handle Left arrow - reset to timeline start
    if (key === 'ArrowLeft') {
      event.preventDefault();

      // Clean up particle animations
      particleAnimationController.cleanup();

      // Reset viewport to start
      viewportController.resetToStart();

      // Clear event highlights
      timeline.highlightEvent(null);

      return;
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

    // Get key event positions for auto-scroll pause detection
    const keyEventPositions = timeline.getKeyEventPositions();

    // Create key event reached callback (for visual highlight)
    const handleKeyEventReached = (eventId: string | null): void => {
      timeline.highlightEvent(eventId);
    };

    // Create particle animation controller
    const particleAnimationController = new ParticleAnimationController(
      timeline.getSvg(),
      timeline.getXScale(),
      data.people,
      (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
      LAYOUT.lanes.people.yPosition
    );

    // Create particle update callback
    const updateParticles = (currentPositionX: number): void => {
      particleAnimationController.update(currentPositionX);
    };

    // Create viewport controller for panning
    const viewportController = new ViewportController(
      container,
      timeline.getTimelineWidth(),
      timeline.getXScale(),
      timeline.getStartDate(),
      timeline.getEndDate(),
      keyEventPositions,
      updateCounters,
      handleKeyEventReached,
      updateParticles
    );

    // Setup keyboard controls
    setupKeyboardControls(viewportController, timeline, particleAnimationController);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
