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
      const spawnX = joinX - this.spawnOffsetX;

      // Calculate lane width at join date to find bottom edge
      // This accounts for previous joins (lane grows over time)
      const laneWidthAtJoin = this.getLaneWidthAt(person.joined);
      const laneBottomY = this.peopleLaneCenterY + laneWidthAtJoin / 2;

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
   * Will be implemented in Task 3.2
   */
  private spawnParticle(particle: ParticleAnimation): void {
    // Task 3.2 will implement spawning logic here
    // For now, just log
    console.log(`Spawning particle: ${particle.personName} at x=${particle.spawnX.toFixed(1)}`);
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

