/**
 * Main entry point for the timeline visualization
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { LAYOUT } from './config';
import './style.css';

const CONTAINER_ID = 'timeline-container';

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

    // Create and render timeline
    const timeline = new Timeline(container, data);
    timeline.render();

    // Create viewport controller for panning
    const viewportController = new ViewportController(
      container,
      timeline.getTimelineWidth(),
      timeline.getXScale(),
      timeline.getStartDate(),
      timeline.getEndDate()
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
