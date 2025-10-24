/**
 * Main entry point
 */

import { loadTimelineData } from './data-loader';
import { Timeline } from './timeline';
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

// Start the application
init();
