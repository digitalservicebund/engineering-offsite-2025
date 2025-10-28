/**
 * ParticleAnimationController - Manages particle lifecycle during forward auto-scroll
 * 
 * Responsibilities:
 * - Detect when person joins are about to appear during auto-scroll
 * - Spawn particle animations (blue circles with name labels)
 * - Animate particles diagonally upward-right from below lane to merge point
 * - Fade out particles after reaching lane
 * - Clean up completed particles
 */

import * as d3 from 'd3';
import type { Person, ParticleAnimation } from './types';
import { LAYOUT } from './config';

export class ParticleAnimationController {
  // Private properties
  private readonly xScale: d3.ScaleTime<number, number>;
  private readonly people: Person[];
  private readonly getLaneWidthAt: (date: Date) => number;
  private readonly peopleLaneCenterY: number;
  private readonly spawnOffsetX: number;

  private activeParticles: Map<string, ParticleAnimation>; // Tracks particles in progress
  private completedJoins: Set<string>; // Person names whose join animations completed
  private particleGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private particleMetadata: Map<string, ParticleAnimation>; // Pre-calculated spawn data

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleTime<number, number>,
    people: Person[],
    getLaneWidthAt: (date: Date) => number,
    peopleLaneCenterY: number
  ) {
    this.xScale = xScale;
    this.people = people;
    this.getLaneWidthAt = getLaneWidthAt;
    this.peopleLaneCenterY = peopleLaneCenterY;

    // Compute spawn offset X (1/3 of pixels per year)
    this.spawnOffsetX = LAYOUT.timeline.pixelsPerYear / 3;

    // Initialize tracking structures
    this.activeParticles = new Map();
    this.completedJoins = new Set();
    this.particleMetadata = new Map();

    // Create SVG group for particles
    this.particleGroup = svg
      .append('g')
      .attr('class', 'particle-animations')
      .attr('pointer-events', 'none'); // Particles don't capture mouse events

    // Task 2.2: Precompute viewport height validation
    this.validateViewportHeight();

    // Task 2.3: Pre-calculate particle metadata for all people
    this.precalculateParticleMetadata();

    console.log(
      `ParticleAnimationController initialized: ${people.length} people, spawn offset X=${this.spawnOffsetX.toFixed(1)}px`
    );
  }

  /**
   * Task 2.2: Validate that particles won't spawn off-screen
   * Calculates worst-case spawn point (all people active simultaneously)
   */
  private validateViewportHeight(): void {
    // Worst case: all people active simultaneously
    const maxPeopleCount = this.people.length;
    const maxLaneWidth =
      LAYOUT.lanes.people.baseStrokeWidth +
      maxPeopleCount * LAYOUT.lanes.people.pixelsPerPerson;
    const maxBottomEdgeY = this.peopleLaneCenterY + maxLaneWidth / 2;
    const lowestSpawnY = maxBottomEdgeY + LAYOUT.particleAnimations.people.spawnOffsetY;

    // Check against viewport
    if (lowestSpawnY > LAYOUT.viewport.height) {
      console.warn(
        `⚠️ Particles may spawn off-screen! Lowest spawn: ${lowestSpawnY}px, ` +
          `viewport: ${LAYOUT.viewport.height}px. Consider reducing spawnOffsetY.`
      );
    } else {
      const margin = LAYOUT.viewport.height - lowestSpawnY;
      console.log(`✓ Viewport height OK: ${margin.toFixed(0)}px margin`);
    }
  }

  /**
   * Task 2.3: Pre-calculate particle metadata for all people
   * Builds lookup map with spawn positions and lane bottom edge for each person
   */
  private precalculateParticleMetadata(): void {
    for (const person of this.people) {
      const joinX = this.xScale(person.joined);
      let spawnX = joinX - this.spawnOffsetX;

      // Edge case: Clamp spawnX to timeline start (0) for very early joins
      if (spawnX < 0) {
        console.warn(
          `⚠️  Particle spawn position clamped for ${person.name}: ` +
          `spawnX=${spawnX.toFixed(1)} → 0 (join date very early in timeline)`
        );
        spawnX = 0;
      }

      // Calculate lane width at join date to find bottom edge
      // This accounts for previous joins (lane grows over time)
      const laneWidthAtJoin = this.getLaneWidthAt(person.joined);
      const laneBottomY = this.peopleLaneCenterY + laneWidthAtJoin / 2;

      // Edge case: Runtime check for particles spawning below viewport
      const spawnY = laneBottomY + LAYOUT.particleAnimations.people.spawnOffsetY;
      if (spawnY > LAYOUT.viewport.height) {
        console.warn(
          `⚠️  Particle spawn position too low for ${person.name}: ` +
          `spawnY=${spawnY.toFixed(1)} > viewport.height=${LAYOUT.viewport.height} ` +
          `(may appear off-screen)`
        );
      }

      this.particleMetadata.set(person.name, {
        id: `particle-${person.name}`,
        personName: person.name,
        joinDate: person.joined,
        joinX,
        spawnX,
        laneBottomY,
        hasSpawned: false,
        isComplete: false,
      });
    }

    console.log(`✓ Pre-calculated metadata for ${this.particleMetadata.size} particles`);
  }

  /**
   * Update particle system - called every frame during auto-scroll
   * Detects when particles should spawn based on current viewport position
   * 
   * @param currentViewportX - The x-position of the viewport position marker (75% point)
   */
  public update(currentViewportX: number): void {
    const detectionWindowSize = LAYOUT.particleAnimations.people.detectionWindowSize;

    // Iterate through all pre-calculated particle metadata
    for (const [personName, particle] of this.particleMetadata) {
      // Skip if already completed this session
      if (this.completedJoins.has(personName)) {
        continue;
      }

      // Calculate detection window buffer around spawn point
      const windowStart = particle.spawnX - detectionWindowSize;
      const windowEnd = particle.spawnX + detectionWindowSize;

      // Check if viewport position is within detection window
      const inDetectionWindow =
        currentViewportX >= windowStart && currentViewportX <= windowEnd;

      if (inDetectionWindow) {
        // Check if particle already active
        if (!this.activeParticles.has(personName)) {
          // Add to active particles (but don't spawn yet)
          this.activeParticles.set(personName, particle);
        }
      }

      // Check if we should spawn the particle
      // Spawn when viewport crosses the spawn X position
      if (currentViewportX >= particle.spawnX && !particle.hasSpawned) {
        // Only spawn if particle is active (was detected in window)
        if (this.activeParticles.has(personName)) {
          this.spawnParticle(particle);
          particle.hasSpawned = true;
        }
      }
    }
  }

  /**
   * Spawn a particle by creating SVG elements
   * Creates nested group structure for transform-based animation
   * 
   * Visual encoding: Blue circle represents person joining, text label identifies who
   */
  private spawnParticle(particle: ParticleAnimation): void {
    // Outer group: positioned at final merge location (joinX, laneBottomY)
    const particleContainer = this.particleGroup
      .append('g')
      .attr('class', 'particle-container')
      .attr('data-person-name', particle.personName)
      .attr('transform', `translate(${particle.joinX}, ${particle.laneBottomY})`);

    // Inner animation group: starts offset (left and down), will animate to (0,0)
    const offsetX = -(particle.joinX - particle.spawnX); // Negative = left offset
    const offsetY = LAYOUT.particleAnimations.people.spawnOffsetY; // Positive = down offset

    const animationGroup = particleContainer
      .append('g')
      .attr('class', 'particle-animation')
      .attr('transform', `translate(${offsetX}, ${offsetY})`);

    // Circle at origin (0,0) within animation group
    animationGroup
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', LAYOUT.particleAnimations.people.circleRadius)
      .attr('fill', LAYOUT.particleAnimations.people.circleColor);

    // Text label to the right of circle
    animationGroup
      .append('text')
      .attr('x', LAYOUT.particleAnimations.people.labelOffsetX)
      .attr('y', 4) // Vertical centering offset
      .attr('text-anchor', 'start')
      .attr('font-size', LAYOUT.particleAnimations.people.labelFontSize)
      .attr('font-family', LAYOUT.particleAnimations.people.labelFontFamily)
      .attr('fill', LAYOUT.particleAnimations.people.labelColor)
      .text(particle.personName);

    // Store reference for animation
    particle.element = animationGroup;

    console.log(`✓ Spawned particle: ${particle.personName}`);

    // Start animation immediately
    this.animateParticle(particle);
  }

  /**
   * Animate particle diagonally upward-right from spawn position to merge point
   * Animates the inner animation group's transform from offset to (0,0)
   * Single transform animates both X (left→right) and Y (down→up) simultaneously
   * Duration synced to autoscroll speed so particle travels with viewport
   */
  private animateParticle(particle: ParticleAnimation): void {
    if (!particle.element) {
      console.error(`Cannot animate particle: element not created for ${particle.personName}`);
      return;
    }

    // Calculate animation duration based on autoscroll speed
    // Duration = distance / speed (converted to milliseconds)
    const distance = this.spawnOffsetX; // X-axis distance to travel
    const speed = LAYOUT.autoScroll.speed; // px/sec
    const duration = (distance / speed) * 1000; // Convert to ms

    // Animate transform from current offset to (0, 0) = merge position
    // Use linear easing so X-velocity matches viewport scroll exactly
    particle.element
      .transition()
      .duration(duration)
      .ease(d3.easeLinear)
      .attr('transform', 'translate(0, 0)')
      .on('end', () => {
        // Animation complete - start fade-out
        this.fadeOutParticle(particle);
      });
  }

  /**
   * Fade out particle after animation completes
   * Will be implemented in Task 5.1
   */
  private fadeOutParticle(particle: ParticleAnimation): void {
    // Task 5.1 will implement fade-out logic here
    // For now, just log
    console.log(`Fading out particle: ${particle.personName}`);
  }

  /**
   * Clean up all particle animations
   * Called when resetting timeline (Left Arrow) or destroying controller
   */
  public cleanup(): void {
    // Interrupt any ongoing transitions
    this.particleGroup.selectAll('.particle-container').interrupt();

    // Remove all particle elements
    this.particleGroup.selectAll('.particle-container').remove();

    // Clear tracking state
    this.activeParticles.clear();
    this.completedJoins.clear();

    console.log('Particle animations cleaned up');
  }
}

