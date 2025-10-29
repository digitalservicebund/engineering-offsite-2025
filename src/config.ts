/**
 * Layout configuration constants
 */

/**
 * Color Palette
 * All colors used throughout the application
 */
const COLORS = {
  // Brand/Lane Colors
  projects: '#7ED321',   // Green - projects lane
  events: '#F5A623',     // Orange - events lane, markers, thumbnails
  people: '#4A90E2',     // Blue - people lane, particles
  
  // UI Colors
  text: '#2C3E50',       // Dark gray - text labels, counters
  background: '#F8F9FA', // Light gray - timeline background
  gridlines: '#E0E0E0',  // Medium gray - gridlines, borders
} as const;

export const LAYOUT = {
  viewport: {
    width: 1200,
    height: 800,
  },
  timeline: {
    pixelsPerYear: 800,
  },
  scroll: {
    currentPositionRatio: 0.75, // ratio (0-1) - viewport position used as "current" date marker
  },
  autoScroll: {
    speed: 200, // px/sec - constant scroll speed per spec
    keyEventPauseThreshold: 5, // px - how close to key event before pausing
  },
  lanes: {
    projects: {
      yPosition: 150,
      initialStrokeWidth: 2,
      color: COLORS.projects,
      baseStrokeWidth: 2, // px - minimum width before any projects start
      // Path generation parameters for smooth organic curves
      minEventSpacing: 50, // px - minimum distance between width changes; closer events are consolidated
      bezierTension: 0.4, // 0-1 - horizontal control point offset for Bezier curves (lower = more flowing)
      bezierVerticalTension: 0.8, // 0-1 - vertical interpolation for S-curves (higher = tighter curves)
    },
    events: {
      yPosition: 400,
      strokeWidth: 8,
      color: COLORS.events,
    },
    people: {
      yPosition: 650,
      initialStrokeWidth: 2,
      color: COLORS.people,
      baseStrokeWidth: 2, // px - minimum width before any people join
      pixelsPerPerson: 2, // px - width increment per active person
      // Path generation parameters for smooth organic curves
      minEventSpacing: 50, // px - minimum distance between width changes; closer events are consolidated
      bezierTension: 0.4, // 0-1 - horizontal control point offset for Bezier curves (lower = more flowing)
      bezierVerticalTension: 0.8, // 0-1 - vertical interpolation for S-curves (higher = tighter curves)
    },
  },
  eventMarkers: {
    lineHeight: 30, // px - extends upward from top edge of lane
    lineWidth: 3, // px - stroke width
    color: COLORS.events,
    label: {
      fontSize: 11, // px
      fontFamily: 'sans-serif' as const,
      color: COLORS.text,
      offsetY: -5, // px - space between bottom edge of text and marker top
      maxWidth: 100, // px - text wraps within this width
    },
    keyMoment: {
      fontWeight: 700, // Bold weight for emphasis
      fontSize: 11,
    },
    regular: {
      fontWeight: 400, // Normal weight
      fontSize: 11,
    },
  },
  particleAnimations: {
    subduedOpacity: 0.6, // Applied via fill-opacity for departure particles (leaving/ending)
    people: {
      joining: {
        spawnOffsetY: 60, // px - vertical distance below people lane bottom edge where particle starts
        // Note: spawnOffsetX calculated at runtime as LAYOUT.timeline.pixelsPerYear / 3
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 300, // ms - fade duration after reaching lane
        circleRadius: 8, // px - particle circle size
        circleColor: COLORS.people,
        labelOffsetX: 15, // px - text position to right of circle
        labelFontSize: 11, // px - matches event marker labels
        labelFontFamily: 'sans-serif' as const,
        labelColor: COLORS.text,
      },
      leaving: {
        spawnOffsetY: 60, // px - below lane (same side as joining) - particles separate downward
        animateTowardLane: false, // Animate away from lane (departure)
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 600, // ms - slower fade for contemplative feel (vs 300ms for joining)
        circleRadius: 8, // px - particle circle size
        circleColor: COLORS.people, // Same color, subdued via fill-opacity
        labelOffsetX: 15, // px - text position to right of circle
        labelFontSize: 11, // px - matches event marker labels
        labelFontFamily: 'sans-serif' as const,
        labelColor: COLORS.text,
      },
    },
    projects: {
      starting: {
        spawnOffsetY: -60, // px - NEGATIVE = above lane
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 300, // ms - fade duration after reaching lane
        circleRadius: 8, // px - particle circle size
        circleColor: COLORS.projects, // Green - matches project lane
        labelOffsetX: 15, // px - text position to right of circle
        labelFontSize: 11, // px - matches event marker labels
        labelFontFamily: 'sans-serif' as const,
        labelColor: COLORS.text,
      },
      ending: {
        spawnOffsetY: -60, // px - above lane (same side as starting) - particles separate upward
        animateTowardLane: false, // Animate away from lane (departure)
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 600, // ms - slower fade for contemplative feel (vs 300ms for starting)
        circleRadius: 8, // px - particle circle size
        circleColor: COLORS.projects, // Same color, subdued via fill-opacity
        labelOffsetX: 15, // px - text position to right of circle
        labelFontSize: 11, // px - matches event marker labels
        labelFontFamily: 'sans-serif' as const,
        labelColor: COLORS.text,
      },
    },
  },
  photoDisplay: {
    fadeInDuration: 150, // ms - photo fade-in timing (applied via JS)
    fadeOutDuration: 150, // ms - photo fade-out/shrink timing (applied via JS)
    thumbnailSize: 100, // px - thumbnail max width/height
    thumbnailGapBelowLane: 10, // px - gap between lane bottom edge and thumbnail top
  },
  gridlines: {
    color: COLORS.gridlines,
    strokeWidth: 1,
  },
  background: COLORS.background,
  textColor: COLORS.text,
} as const;

export type LayoutConfig = typeof LAYOUT;

/**
 * Inject CSS custom properties (variables) from config at runtime
 * 
 * INJECTION POLICY: Only inject values that are actively used by BOTH:
 * 1. TypeScript code (calculations, setTimeout, D3 rendering)
 * 2. CSS rules (transitions, styling)
 * 
 * Do NOT inject TS-only values (e.g., pixelsPerPerson, scroll speed)
 * Do NOT inject CSS-only values (e.g., border-radius, shadows)
 */
export function injectCSSVariables(): void {
  const root = document.documentElement;

  // Photo animation durations (TS: setTimeout, CSS: transitions)
  root.style.setProperty('--anim-photo-fade-in', `${LAYOUT.photoDisplay.fadeInDuration}ms`);
  root.style.setProperty('--anim-photo-fade-out', `${LAYOUT.photoDisplay.fadeOutDuration}ms`);

  // Event color (TS: D3 SVG lane rendering, CSS: thumbnail border)
  root.style.setProperty('--color-events', LAYOUT.lanes.events.color);

  console.log('✓ CSS variables injected from config');
}

