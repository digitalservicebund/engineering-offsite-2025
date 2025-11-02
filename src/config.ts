/**
 * Layout configuration constants
 */

/**
 * Color Palette
 * All colors used throughout the application
 */
const COLORS = {
  // Brand/Lane Colors
  projects: '#f08640',   // projects lane
  events: '#66c8f2',     // events lane, markers, thumbnails
  people: '#b49dca',     // people lane, particles

  // UI Colors
  text: '#2A2B2D',       // Dark gray - text labels, counters
  background: '#E9EEF3', // Light gray - timeline background
  gridlines: '#C7CED4',  // Medium gray - gridlines, borders
} as const;

export const LAYOUT = {
  viewport: {
    width: 1400,
    height: 800,
  },
  timeline: {
    pixelsPerYear: 2000,
  },
  scroll: {
    currentPositionRatio: 0.56, // ratio (0-1) - viewport position used as "current" date marker
  },
  autoScroll: {
    speed: 200, // px/sec - constant scroll speed per spec
    shiftSpeedMultiplier: 5, // multiplier when holding Shift during auto-scroll
    keyEventPauseThreshold: 4, // px - how close to key event before pausing
  },
  lanes: {
    projects: {
      yPosition: 150,
      initialStrokeWidth: 1,
      color: COLORS.projects,
      baseStrokeWidth: 1, // px - minimum width before any projects start
      // Path generation parameters
      transitionDurationDays: 14, // days - width changes complete over 2 days
      pathSmoothingTension: 0.2, // 0-1 - control point offset for cosmetic smoothing (0.5 was too loose)
    },
    events: {
      yPosition: 400,
      strokeWidth: 8,
      color: COLORS.events,
    },
    people: {
      yPosition: 650,
      initialStrokeWidth: 1,
      color: COLORS.people,
      baseStrokeWidth: 1, // px - minimum width before any people join
      pixelsPerPerson: 1, // px - width increment per active person
      // Path generation parameters
      transitionDurationDays: 1, // days - width changes complete over 1 day
      pathSmoothingTension: 0.2, // 0-1 - control point offset for cosmetic smoothing (0.5 was too loose)
    },
  },
  laneLabels: {
    offsetX: -120, // px - negative = to the left of timeline start (x=0)
    leftPadding: 140, // px - viewBox left padding to accommodate labels
  },
  eventMarkers: {
    lineHeight: 30, // px - extends upward from top edge of lane
    lineWidth: 3, // px - stroke width
    color: COLORS.events,
    label: {
      offsetY: -5, // px - space between bottom edge of text and marker top
      maxWidth: 180, // px - text wraps within this width
      height: 50, // px - estimated label container height for multi-line text (should accommodate ~2 lines at current font size)
      // Label stacking configuration to avoid overlaps
      stack: {
        minHorizontalGap: 12, // px - extra gap between adjacent label boxes
        tierHeight: 55, // px - vertical distance between stacked tiers (should be >= label height + some spacing)
        maxTiers: 5, // maximum number of tiers above the lane (0, 1, 2, 3, 4)
        maxTiersBelow: 4, // maximum number of tiers below the lane (-1, -2, -3, -4, for regular events only)
      },
    },
  },
  particleAnimations: {
    // Shared particle appearance settings
    particle: {
      circleRadius: 4, // px - particle circle size
      labelOffsetX: 15, // px - text position to right of circle
      labelFontSize: 13, // px - matches event marker labels
      labelFontFamily: 'sans-serif' as const,
      labelColor: COLORS.text,
      labelStagger: {
        proximityThreshold: 100, // px - particles within this distance are considered "nearby"
        verticalStep: 20,         // px - vertical spacing between staggered labels
        maxOffset: 60,            // px - maximum vertical offset (cap at ±60px)
      },
    },
    subduedOpacity: 0.85, // Applied via fill-opacity for departure particles (leaving/ending)
    people: {
      joining: {
        spawnOffsetY: 60, // px - vertical distance below people lane bottom edge where particle starts
        // Note: spawnOffsetX calculated at runtime as LAYOUT.timeline.pixelsPerYear / 3
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 300, // ms - fade duration after reaching lane
        circleColor: COLORS.people,
      },
      leaving: {
        spawnOffsetY: 60, // px - below lane (same side as joining) - particles separate downward
        animateTowardLane: false, // Animate away from lane (departure)
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 600, // ms - slower fade for contemplative feel (vs 300ms for joining)
        circleColor: COLORS.people, // Same color, subdued via fill-opacity
      },
    },
    projects: {
      starting: {
        spawnOffsetY: -60, // px - NEGATIVE = above lane
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 300, // ms - fade duration after reaching lane
        circleColor: COLORS.projects, // Green - matches project lane
      },
      ending: {
        spawnOffsetY: -60, // px - above lane (same side as starting) - particles separate upward
        animateTowardLane: false, // Animate away from lane (departure)
        detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
        fadeOutDuration: 600, // ms - slower fade for contemplative feel (vs 300ms for starting)
        circleColor: COLORS.projects, // Same color, subdued via fill-opacity
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
    major: {
      color: COLORS.gridlines,
      strokeWidth: 4, // px - year boundaries
    },
    minor: {
      color: COLORS.gridlines,
      strokeWidth: 1, // px - month boundaries
      opacity: 0.5, // reduced opacity for subtle appearance
    },
  },
  background: COLORS.background,
  textColor: COLORS.text,
  debug: {
    showFpsCounter: true, // Display FPS counter in top-left corner
  },
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

  // Viewport dimensions (TS: calculations, CSS: container sizing)
  root.style.setProperty('--viewport-width', `${LAYOUT.viewport.width}px`);
  root.style.setProperty('--viewport-height', `${LAYOUT.viewport.height}px`);

  // Photo animation durations (TS: setTimeout, CSS: transitions)
  root.style.setProperty('--anim-photo-fade-in', `${LAYOUT.photoDisplay.fadeInDuration}ms`);
  root.style.setProperty('--anim-photo-fade-out', `${LAYOUT.photoDisplay.fadeOutDuration}ms`);

  // Event color (TS: D3 SVG lane rendering, CSS: thumbnail border)
  root.style.setProperty('--color-events', LAYOUT.lanes.events.color);
  
  // Current date marker position
  const markerPosition = LAYOUT.viewport.width * LAYOUT.scroll.currentPositionRatio;
  root.style.setProperty('--timeline-marker-position', `${markerPosition}px`);
  
  // Future fade overlay (gradient extends from marker to right edge of viewport)
  const fadeWidth = LAYOUT.viewport.width - markerPosition;
  root.style.setProperty('--future-fade-width', `${fadeWidth}px`);

  console.log('✓ CSS variables injected from config');
}

