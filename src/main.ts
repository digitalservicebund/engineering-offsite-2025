/**
 * Main entry point for the timeline visualization
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { CounterCalculator } from './counter-calculator';
import { LanePathGenerator } from './lane-path-generator';
import { ActiveCountCalculator } from './active-count-calculator';
import { ParticleAnimationController } from './particle-animation-controller';
import { PhotoController } from './photo-controller';
import { LAYOUT, injectCSSVariables } from './config';
import type { Person, Project } from './types';
import './style.css';

// DOM element IDs
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
    <div class="error-container">
      <h2>Error Loading Timeline</h2>
      <p>${errorMessage}</p>
    </div>
  `;
}

/**
 * Display blocking configuration error
 */
function displayConfigError(title: string, messages: string[]): void {
  document.body.innerHTML = `
    <div class="config-error-overlay">
      <div class="config-error-content">
        <h1 class="config-error-title">⚠️ ${title}</h1>
        <div class="config-error-messages">
          ${messages.map((msg) => `<p>• ${msg}</p>`).join('')}
        </div>
        <p class="config-error-footer">
          Fix the configuration errors above and reload the page.
        </p>
      </div>
    </div>
  `;
}

/**
 * Setup keyboard event listeners for auto-scroll state machine
 */
function setupKeyboardControls(
  viewportController: ViewportController,
  timeline: Timeline,
  peopleParticleController: ParticleAnimationController<Person>,
  projectParticleController: ParticleAnimationController<Project>,
  photoController: PhotoController
): void {
  const handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
    const { key } = event;
    const currentState = viewportController.getScrollState();

    // Handle Space bar or Right arrow - unified behavior
    if (key === ' ' || key === 'ArrowRight') {
      event.preventDefault();

      // If photo is displayed, dismiss it and resume scrolling
      if (photoController.hasActivePhoto()) {
        await photoController.hidePhotoAndCreateThumbnail();
        timeline.highlightEvent(null);
        viewportController.resumeAutoScroll();
        return;
      }

      // State-aware scroll control
      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll();
        timeline.highlightEvent(null);
      } else if (currentState === 'scrolling') {
        // Toggle pause (manual pause)
        viewportController.togglePause();
      } else if (currentState === 'paused') {
        // Resume auto-scroll
        timeline.highlightEvent(null);
        viewportController.resumeAutoScroll();
      }
      return;
    }

    // Handle Left arrow - reset to timeline start
    if (key === 'ArrowLeft') {
      event.preventDefault();

      // Clean up particle animations and photos
      peopleParticleController.cleanup();
      projectParticleController.cleanup();
      photoController.cleanup();

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
    // Inject CSS variables from config before any DOM creation
    injectCSSVariables();

    console.log('Loading timeline data...');

    const data = await loadTimelineData();
    console.log('Data loaded:', data);

    // Validate photo files before initializing timeline
    console.log('Validating photo files...');
    const missingPhotos = await PhotoController.validatePhotoFiles(data.events);
    if (missingPhotos.length > 0) {
      displayConfigError('Missing Photo Files', missingPhotos);
      return; // Block timeline initialization
    }
    console.log('✓ All photo files validated');

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

    // Create project width calculator (sums widthIncrement values, not counts)
    const projectWidthCalculator = new ActiveCountCalculator<Project>(
      data.projects,
      (project) => project.start,
      (project) => project.end,
      {
        entityName: 'Projects (width)',
        formatDescription: (proj, isStart) => `${proj.name} ${isStart ? '+' : '-'}${proj.widthIncrement}px`,
      },
      (project) => project.widthIncrement, // Custom start delta: add widthIncrement
      (project) => -project.widthIncrement // Custom end delta: subtract widthIncrement (parallel to people)
    );

    // Create lane path generators using generic implementation
    const peopleLanePathGenerator = new LanePathGenerator<Person>(
      peopleCount,
      LAYOUT.lanes.people,
      (count) => LAYOUT.lanes.people.baseStrokeWidth + count * LAYOUT.lanes.people.pixelsPerPerson
    );

    const projectLanePathGenerator = new LanePathGenerator<Project>(
      projectWidthCalculator,
      LAYOUT.lanes.projects,
      (count) => LAYOUT.lanes.projects.baseStrokeWidth + count
    );

    // Create and render timeline (with dynamic people and project lanes)
    const timeline = new Timeline(container, data, peopleLanePathGenerator, projectLanePathGenerator);
    timeline.render();

    // Create photo controller (creates and manages its own overlay)
    const photoController = new PhotoController(
      document.body,
      container,
      LAYOUT.lanes.events.yPosition,
      timeline.getTimelineWidth()
    );

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

    // Create key event reached callback (for visual highlight and photo display)
    const handleKeyEventReached = (eventId: string | null): void => {
      // Highlight event marker (existing logic)
      timeline.highlightEvent(eventId);

      // If event has photo, show it
      if (eventId) {
        const event = data.events.find((e) => e.id === eventId);
        if (event?.hasPhoto) {
          const markerX = timeline.getXScale()(event.date);
          photoController.showPhoto(event, markerX);
        }
      }
    };

    // Create particle animation controllers
    const peopleParticleController = new ParticleAnimationController<Person>(
      timeline.getSvg(),
      timeline.getXScale(),
      data.people,
      (person) => person.joined,
      (person) => person.name,
      (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.people.yPosition,
        ...LAYOUT.particleAnimations.people.joining,
      }
    );

    const projectParticleController = new ParticleAnimationController<Project>(
      timeline.getSvg(),
      timeline.getXScale(),
      data.projects,
      (project) => project.start,
      (project) => project.name,
      (date) => projectLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.projects.yPosition,
        ...LAYOUT.particleAnimations.projects.starting,
      }
    );

    // Create particle update callback
    const updateParticles = (currentPositionX: number): void => {
      peopleParticleController.update(currentPositionX);
      projectParticleController.update(currentPositionX);
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
    setupKeyboardControls(viewportController, timeline, peopleParticleController, projectParticleController, photoController);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
