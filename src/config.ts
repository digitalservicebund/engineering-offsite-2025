/**
 * Layout configuration constants
 */

export const LAYOUT = {
  viewport: {
    width: 1200,
    height: 800
  },
  timeline: {
    pixelsPerYear: 400
  },
  lanes: {
    projects: {
      yPosition: 150,
      initialStrokeWidth: 2,
      color: '#7ED321'  // Green
    },
    events: {
      yPosition: 400,
      strokeWidth: 8,
      color: '#F5A623'  // Orange
    },
    people: {
      yPosition: 650,
      initialStrokeWidth: 2,
      color: '#4A90E2'  // Blue
    }
  },
  eventMarkers: {
    // Vertical line extending upward from events lane
    lineHeight: 30,          // px - extends upward from top edge of lane
    lineWidth: 3,            // px - stroke width
    color: '#F5A623',        // Orange - matches events lane
    
    // Text label styling (wraps automatically, never truncates)
    label: {
      fontSize: 11,          // px
      fontFamily: 'sans-serif',
      color: '#2C3E50',      // Matches textColor
      offsetY: -5,           // px - space between bottom edge of text and marker top
      maxWidth: 100,         // px - text wraps within this width
    },
    
    // Visual distinction for key moments (isKeyMoment: true)
    keyMoment: {
      fontWeight: 700,       // Bold weight for emphasis
      fontSize: 11,          // Keep same size, just bold
    },
    
    // Regular (non-key) events
    regular: {
      fontWeight: 400,       // Normal weight
      fontSize: 11,
    }
  },
  gridlines: {
    color: '#E0E0E0',
    strokeWidth: 1
  },
  background: '#F8F9FA',
  textColor: '#2C3E50'
};

