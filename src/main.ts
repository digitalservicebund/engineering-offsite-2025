/**
 * Main entry point
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
import { ViewportController } from './viewport-controller';
import { LAYOUT } from './config';
import './style.css';

async function init() {
  try {
    console.log('Loading timeline data...');
    
    // Load data
    const data = await loadTimelineData();
    console.log('Data loaded:', data);
    
    // Get container
    const container = document.getElementById('timeline-container');
    if (!container) {
      throw new Error('Container element #timeline-container not found');
    }
    
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
    
    // Display error message to user
    const container = document.getElementById('timeline-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #E74C3C; font-family: sans-serif;">
          <h2>Error Loading Timeline</h2>
          <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      `;
    }
  }
}

/**
 * Setup keyboard event listeners for timeline panning
 */
function setupKeyboardControls(viewportController: ViewportController): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // Handle Space bar and Right arrow - pan right
    if (event.key === ' ' || event.key === 'ArrowRight') {
      event.preventDefault(); // Prevent default browser behavior (page scroll)
      viewportController.panRight(LAYOUT.scroll.panDistance);
    }
    
    // Handle Left arrow - pan left
    if (event.key === 'ArrowLeft') {
      event.preventDefault(); // Prevent default browser behavior
      viewportController.panLeft(LAYOUT.scroll.panDistance);
    }
  });
  
  console.log('✓ Keyboard controls enabled (Space/Right/Left arrows)');
}

// Start the application
init();
