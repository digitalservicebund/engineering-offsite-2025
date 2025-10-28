/**
 * Layout configuration constants
 */

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
    pausedIndicatorPulseDuration: 2000, // ms - duration of pulse animation
  },
  counters: {
    position: {
      top: 20, // px - distance from top edge
      right: 40, // px - distance from right edge
    },
    fontSize: 18, // px
    fontWeight: 500, // Medium weight
    fontFamily: 'sans-serif' as const,
    color: '#2C3E50', // Matches textColor
    separatorSpacing: 16, // px - space around separator (|)
  },
  lanes: {
    projects: {
      yPosition: 150,
      initialStrokeWidth: 2,
      color: '#7ED321', // Green
    },
    events: {
      yPosition: 400,
      strokeWidth: 8,
      color: '#F5A623', // Orange
    },
    people: {
      yPosition: 650,
      initialStrokeWidth: 2,
      color: '#4A90E2', // Blue
      baseStrokeWidth: 2, // px - minimum width before any people join
      pixelsPerPerson: 2, // px - width increment per active person
      widthTransitionDuration: 300, // ms - duration of lane width growth animation (0.3s per spec)
      widthTransitionEasing: 'ease-out' as const, // D3 easing for lane width changes
      // Path generation parameters for smooth organic curves
      minEventSpacing: 50, // px - minimum distance between width changes; closer events are consolidated
      bezierTension: 0.4, // 0-1 - horizontal control point offset for Bezier curves (lower = more flowing)
      bezierVerticalTension: 0.8, // 0-1 - vertical interpolation for S-curves (higher = tighter curves)
    },
  },
  eventMarkers: {
    lineHeight: 30, // px - extends upward from top edge of lane
    lineWidth: 3, // px - stroke width
    color: '#F5A623', // Orange - matches events lane
    label: {
      fontSize: 11, // px
      fontFamily: 'sans-serif' as const,
      color: '#2C3E50', // Matches textColor
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
    people: {
      spawnOffsetY: 60, // px - vertical distance below people lane bottom edge where particle starts
      // Note: spawnOffsetX calculated at runtime as LAYOUT.timeline.pixelsPerYear / 3
      detectionWindowSize: 50, // px - buffer around spawn point to prevent missed spawns due to frame timing
      fadeOutDuration: 300, // ms - fade duration after reaching lane
      circleRadius: 8, // px - particle circle size
      circleColor: '#4A90E2', // Blue - matches people lane color
      labelOffsetX: 15, // px - text position to right of circle
      labelFontSize: 11, // px - matches event marker labels
      labelFontFamily: 'sans-serif' as const,
      labelColor: '#2C3E50', // Matches text color
    },
  },
  photoDisplay: {
    overlayBackdropColor: 'rgba(0, 0, 0, 0.7)', // Dark backdrop behind full-screen photo
    photoMaxWidthPercent: 70, // 60-70% of screen width
    photoMaxHeightPercent: 70, // Similar constraint for height
    fadeInDuration: 150, // ms - photo fade-in timing
    fadeOutDuration: 150, // ms - photo fade-out/shrink timing
    captionFontSize: 24, // px - caption text size
    captionFontWeight: 300, // Light weight for elegance
    captionColor: '#FFFFFF', // White text
    captionOffsetY: 40, // px - distance from bottom of photo to caption
    thumbnailSize: 100, // px - thumbnail max width/height
    thumbnailGapBelowLane: 10, // px - gap between lane bottom edge and thumbnail top
  },
  gridlines: {
    color: '#E0E0E0',
    strokeWidth: 1,
  },
  background: '#F8F9FA',
  textColor: '#2C3E50',
} as const;

export type LayoutConfig = typeof LAYOUT;

