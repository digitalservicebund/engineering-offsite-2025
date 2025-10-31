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
import { FpsCounter } from './fps-counter';
import { LAYOUT, injectCSSVariables } from './config';
import type { Person, Project } from './types';
import './style.css';

// DOM element IDs
const CONTAINER_ID = 'timeline-container';
const COUNTER_ENGINEERS_ID = 'counter-engineers';
const COUNTER_PROJECTS_ID = 'counter-projects';

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
  date: HTMLElement;
} {
  const engineers = document.getElementById(COUNTER_ENGINEERS_ID);
  const projects = document.getElementById(COUNTER_PROJECTS_ID);
  const date = document.getElementById('counter-date');

  if (!engineers || !projects || !date) {
    throw new Error('Counter elements not found in DOM');
  }

  return { engineers, projects, date };
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
  peopleLeavingController: ParticleAnimationController<Person>,
  projectParticleController: ParticleAnimationController<Project>,
  projectsEndingController: ParticleAnimationController<Project>,
  photoController: PhotoController
): void {
  // Track Shift key state for speed multiplier during auto-scroll
  const handleShiftChange = (pressed: boolean): void => {
    viewportController.setShiftPressed(pressed);
  };

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key === 'Shift' && !event.repeat) {
      handleShiftChange(true);
    }
  });

  document.addEventListener('keyup', (event: KeyboardEvent) => {
    if (event.key === 'Shift') {
      handleShiftChange(false);
    }
  });

  const handleKeyDown = async (event: KeyboardEvent): Promise<void> => {
    const { key } = event;
    const currentState = viewportController.getScrollState();

    // Handle Space bar or Right arrow - unified behavior
    if (key === ' ' || key === 'ArrowRight') {
      event.preventDefault();

      // If photo is displayed, dismiss it and resume scrolling
      if (photoController.hasActivePhoto()) {
        await photoController.hidePhotoAndCreateThumbnail();
        
        viewportController.resumeAutoScroll();
        return;
      }

      // State-aware scroll control
      if (currentState === 'idle') {
        // Start auto-scroll forward
        viewportController.startAutoScroll();
        
      } else if (currentState === 'scrolling') {
        // Toggle pause (manual pause)
        viewportController.togglePause();
      } else if (currentState === 'paused') {
        // Resume auto-scroll
        
        viewportController.resumeAutoScroll();
      }
      return;
    }

    // Handle Left arrow - reset to timeline start
    if (key === 'ArrowLeft') {
      event.preventDefault();

      // Clean up particle animations and photos
      peopleParticleController.cleanup();
      peopleLeavingController.cleanup();
      projectParticleController.cleanup();
      projectsEndingController.cleanup();
      photoController.cleanup();

      // Reset viewport to start
      viewportController.resetToStart();

      // Clear event highlights (removed noop)

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

    // Initialize FPS counter if enabled
    let fpsCounter: FpsCounter | null = null;
    if (LAYOUT.debug.showFpsCounter) {
      fpsCounter = new FpsCounter();
      console.log('✓ FPS counter enabled');
    }

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
      const formattedDate = counterCalculator.getFormattedDateAt(date);

      counterElements.engineers.textContent = `Engineers: ${engineers}`;
      counterElements.projects.textContent = `Projects: ${projects}`;
      counterElements.date.textContent = `Date: ${formattedDate}`;
    };

    // Get key event positions for auto-scroll pause detection
    const keyEventPositions = timeline.getKeyEventPositions();

    // Create key event reached callback (for visual highlight and photo display)
    const handleKeyEventReached = (eventId: string | null): void => {
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
      timeline.getContentGroup(),
      timeline.getXScale(),
      data.people,
      (person) => person.joined,
      (person) => person.name,
      (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.people.yPosition,
        ...LAYOUT.particleAnimations.particle,
        ...LAYOUT.particleAnimations.people.joining,
      }
    );

    const peopleLeavingController = new ParticleAnimationController<Person>(
      timeline.getContentGroup(),
      timeline.getXScale(),
      data.people.filter(p => p.left !== null),
      (person) => person.left!,
      (person) => person.name,
      (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.people.yPosition,
        ...LAYOUT.particleAnimations.particle,
        ...LAYOUT.particleAnimations.people.leaving,
      }
    );

    const projectParticleController = new ParticleAnimationController<Project>(
      timeline.getContentGroup(),
      timeline.getXScale(),
      data.projects,
      (project) => project.start,
      (project) => project.name,
      (date) => projectLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.projects.yPosition,
        ...LAYOUT.particleAnimations.particle,
        ...LAYOUT.particleAnimations.projects.starting,
      }
    );

    const projectsEndingController = new ParticleAnimationController<Project>(
      timeline.getContentGroup(),
      timeline.getXScale(),
      data.projects.filter(p => p.end !== null),
      (project) => project.end!,
      (project) => project.name,
      (date) => projectLanePathGenerator.getStrokeWidthAt(date),
      {
        laneCenterY: LAYOUT.lanes.projects.yPosition,
        ...LAYOUT.particleAnimations.particle,
        ...LAYOUT.particleAnimations.projects.ending,
      }
    );

    // Create particle update callback
    const updateParticles = (currentPositionX: number): void => {
      peopleParticleController.update(currentPositionX);
      peopleLeavingController.update(currentPositionX);
      projectParticleController.update(currentPositionX);
      projectsEndingController.update(currentPositionX);
    };

    // Create viewport controller for panning
    // FPS update callback
    const updateFps = (timestamp: number): void => {
      if (fpsCounter) {
        fpsCounter.recordFrame(timestamp);
      }
    };

    const viewportController = new ViewportController(
      container,
      timeline.getTimelineWidth(),
      timeline.getXScale(),
      timeline.getStartDate(),
      timeline.getEndDate(),
      keyEventPositions,
      updateCounters,
      handleKeyEventReached,
      updateParticles,
      updateFps
    );

    // Setup keyboard controls
    setupKeyboardControls(viewportController, timeline, peopleParticleController, peopleLeavingController, projectParticleController, projectsEndingController, photoController);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
