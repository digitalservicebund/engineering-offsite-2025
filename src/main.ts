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
import { PhotoController } from './photo-controller';
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
 * Display blocking configuration error
 */
function displayConfigError(title: string, messages: string[]): void {
  document.body.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #2C3E50;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: sans-serif;
      z-index: 10000;
    ">
      <div style="max-width: 600px; padding: 40px;">
        <h1 style="color: #E74C3C; margin: 0 0 20px 0; font-size: 32px;">⚠️ ${title}</h1>
        <div style="background: rgba(231, 76, 60, 0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          ${messages.map((msg) => `<p style="margin: 10px 0; font-size: 16px;">• ${msg}</p>`).join('')}
        </div>
        <p style="color: #BDC3C7; margin: 0; font-size: 14px;">
          Fix the configuration errors above and reload the page.
        </p>
      </div>
    </div>
  `;
}

/**
 * Validate that all photo files exist
 * @returns Array of missing photo paths (empty if all valid)
 */
async function validatePhotoFiles(
  data: Awaited<ReturnType<typeof loadTimelineData>>
): Promise<string[]> {
  const photoEvents = data.events.filter((event) => event.hasPhoto);
  const missingPhotos: string[] = [];

  for (const event of photoEvents) {
    const photoUrl = `assets/photos/${event.id}.jpg`;
    try {
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load'));
        img.src = photoUrl;
      });
    } catch {
      missingPhotos.push(`${photoUrl} (event: ${event.name})`);
    }
  }

  return missingPhotos;
}

/**
 * Create photo overlay HTML structure
 */
function createPhotoOverlay(): HTMLElement {
  const photoOverlay = document.createElement('div');
  photoOverlay.id = 'photo-overlay';
  photoOverlay.className = 'photo-overlay hidden';

  // Create backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'photo-backdrop';
  photoOverlay.appendChild(backdrop);

  // Create caption
  const caption = document.createElement('div');
  caption.className = 'photo-caption';
  photoOverlay.appendChild(caption);

  // Append to body
  document.body.appendChild(photoOverlay);

  console.log('✓ Photo overlay created');
  return photoOverlay;
}

/**
 * Setup keyboard event listeners for auto-scroll state machine
 */
function setupKeyboardControls(
  viewportController: ViewportController,
  timeline: Timeline,
  particleAnimationController: ParticleAnimationController,
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
      particleAnimationController.cleanup();
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
    console.log('Loading timeline data...');

    const data = await loadTimelineData();
    console.log('Data loaded:', data);

    // Validate photo files before initializing timeline
    console.log('Validating photo files...');
    const missingPhotos = await validatePhotoFiles(data);
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

    // Create lane path generator (for people lane path generation)
    const peopleLanePathGenerator = new PeopleLanePathGenerator(peopleCount);

    // Create and render timeline (with dynamic people lane)
    const timeline = new Timeline(container, data, peopleLanePathGenerator);
    timeline.render();

    // Create photo overlay
    const photoOverlay = createPhotoOverlay();

    // Create photo controller
    const photoController = new PhotoController(
      photoOverlay,
      container,
      timeline.getXScale(),
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
    setupKeyboardControls(viewportController, timeline, particleAnimationController, photoController);

    console.log('✓ Timeline rendered successfully');
  } catch (error) {
    console.error('Failed to initialize timeline:', error);
    displayError(error);
  }
}

// Start the application
init();
