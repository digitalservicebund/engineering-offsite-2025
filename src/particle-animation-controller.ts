/**
 * ParticleAnimationController - Manages particle lifecycle during forward auto-scroll
 * 
 * Generic controller that works for any entity type (Person, Project, etc.)
 * 
 * Responsibilities:
 * - Detect when entity events are about to appear during auto-scroll
 * - Spawn particle animations (colored circles with name labels)
 * - Animate particles (upward or downward) from spawn point to lane merge point
 * - Fade out particles after reaching lane
 * - Clean up completed particles
 */

import * as d3 from 'd3';
import type { ParticleAnimation } from './types';
import { LAYOUT } from './config';

export class ParticleAnimationController<T> {
  // Private properties
  private readonly xScale: d3.ScaleTime<number, number>;
  private readonly entities: T[];
  private readonly getEntityDate: (entity: T) => Date;
  private readonly getEntityName: (entity: T) => string;
  private readonly getLaneWidthAt: (date: Date) => number;
  private readonly config: {
    laneCenterY: number;
    spawnOffsetY: number; // Positive = below, Negative = above
    circleRadius: number;
    circleColor: string;
    labelOffsetX: number;
    labelFontSize: number;
    labelFontFamily: string;
    labelColor: string;
    detectionWindowSize: number;
    fadeOutDuration: number;
  };
  private readonly spawnOffsetX: number;

  private activeParticles: Map<string, ParticleAnimation>; // Tracks particles in progress
  private completedJoins: Set<string>; // Entity names whose join animations completed
  private particleGroup: d3.Selection<SVGGElement, unknown, null, undefined>;
  private particleMetadata: Map<string, ParticleAnimation>; // Pre-calculated spawn data
  private lastUpdateTime: number = 0; // Track frame timing for pause detection

  constructor(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleTime<number, number>,
    entities: T[],
    getEntityDate: (entity: T) => Date,
    getEntityName: (entity: T) => string,
    getLaneWidthAt: (date: Date) => number,
    config: {
      laneCenterY: number;
      spawnOffsetY: number; // Positive = below, Negative = above
      circleRadius: number;
      circleColor: string;
      labelOffsetX: number;
      labelFontSize: number;
      labelFontFamily: string;
      labelColor: string;
      detectionWindowSize: number;
      fadeOutDuration: number;
    }
  ) {
    this.xScale = xScale;
    this.entities = entities;
    this.getEntityDate = getEntityDate;
    this.getEntityName = getEntityName;
    this.getLaneWidthAt = getLaneWidthAt;
    this.config = config;

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

    // Validate viewport height to ensure particles won't spawn off-screen
    this.validateViewportHeight();

    // Pre-calculate particle metadata for all entities
    this.precalculateParticleMetadata();

    console.log(
      `ParticleAnimationController initialized: ${entities.length} entities, spawn offset X=${this.spawnOffsetX.toFixed(1)}px`
    );
  }

  /**
   * Validate that particles won't spawn off-screen
   * Note: Simplified check - detailed validation done during metadata precalculation
   */
  private validateViewportHeight(): void {
    // Basic validation: Check if spawn position could be off-screen
    const spawnEdgeY = this.config.laneCenterY + this.config.spawnOffsetY;
    
    if (spawnEdgeY < 0 || spawnEdgeY > LAYOUT.viewport.height) {
      console.warn(
        `⚠️ Particles may spawn off-screen! Spawn edge Y: ${spawnEdgeY}px, ` +
          `viewport: ${LAYOUT.viewport.height}px. Check spawnOffsetY configuration.`
      );
    } else {
      console.log(`✓ Spawn position within viewport: Y=${spawnEdgeY.toFixed(0)}px`);
    }
  }

  /**
   * Pre-calculate particle metadata for all entities
   * Builds lookup map with spawn positions and lane edge for each entity
   */
  private precalculateParticleMetadata(): void {
    for (const entity of this.entities) {
      const entityName = this.getEntityName(entity);
      const entityDate = this.getEntityDate(entity);
      
      const joinX = this.xScale(entityDate);
      let spawnX = joinX - this.spawnOffsetX;

      // Edge case: Clamp spawnX to timeline start (0) for very early events
      if (spawnX < 0) {
        console.warn(
          `⚠️  Particle spawn position clamped for ${entityName}: ` +
          `spawnX=${spawnX.toFixed(1)} → 0 (event date very early in timeline)`
        );
        spawnX = 0;
      }

      // Calculate lane width at event date to find lane edge
      // This accounts for previous events (lane grows over time)
      const laneWidthAtEvent = this.getLaneWidthAt(entityDate);
      
      // Calculate lane edge Y based on spawn direction
      // Positive spawnOffsetY = below lane (people) → use bottom edge
      // Negative spawnOffsetY = above lane (projects) → use top edge
      const laneEdgeY = this.config.laneCenterY + 
        (this.config.spawnOffsetY > 0 ? laneWidthAtEvent / 2 : -laneWidthAtEvent / 2);

      // Edge case: Runtime check for particles spawning outside viewport
      const spawnY = laneEdgeY + this.config.spawnOffsetY;
      if (spawnY < 0 || spawnY > LAYOUT.viewport.height) {
        console.warn(
          `⚠️  Particle spawn position outside viewport for ${entityName}: ` +
          `spawnY=${spawnY.toFixed(1)}, viewport height=${LAYOUT.viewport.height} ` +
          `(may appear off-screen)`
        );
      }

      this.particleMetadata.set(entityName, {
        id: `particle-${entityName}`,
        entityName,
        joinDate: entityDate,
        joinX,
        spawnX,
        laneEdgeY,
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
    const now = performance.now();
    
    // Detect resume after pause (gap > 100ms indicates pause)
    if (this.lastUpdateTime > 0 && now - this.lastUpdateTime > 100) {
      const pauseDuration = now - this.lastUpdateTime;
      
      // Adjust all active animations' start times to exclude pause duration
      for (const particle of this.activeParticles.values()) {
        if (particle.animationStartTime) {
          particle.animationStartTime += pauseDuration;
        }
      }
    }
    
    this.lastUpdateTime = now;

    const detectionWindowSize = this.config.detectionWindowSize;
    
    // Iterate through all pre-calculated particle metadata
    for (const [entityName, particle] of this.particleMetadata) {
      // Skip if already completed this session
      if (this.completedJoins.has(entityName)) {
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
        if (!this.activeParticles.has(entityName)) {
          // Add to active particles (but don't spawn yet)
          this.activeParticles.set(entityName, particle);
        }
      }

      // Check if we should spawn the particle
      // Spawn when viewport crosses the spawn X position
      if (currentViewportX >= particle.spawnX && !particle.hasSpawned) {
        // Only spawn if particle is active (was detected in window)
        if (this.activeParticles.has(entityName)) {
          this.spawnParticle(particle);
          particle.hasSpawned = true;
        }
      }
    }

    // Update all active particle animations
    for (const particle of this.activeParticles.values()) {
      if (!particle.animationStartTime || !particle.element || !particle.startTransform) {
        continue;
      }

      // Calculate animation progress
      const elapsed = now - particle.animationStartTime;
      const progress = Math.min(elapsed / particle.animationDuration!, 1);

      // X-axis: Linear motion to stay synchronized with viewport scroll speed
      // Y-axis: Asymptotic easing for organic "settling" into lane
      const x = particle.startTransform.x * (1 - progress); // Linear horizontal motion
      const y = particle.startTransform.y * (1 - this.easeAsymptotic(progress)); // Asymptotic vertical motion

      // Apply transform
      particle.element.attr('transform', `translate(${x}, ${y})`);

      // Check if animation complete
      if (progress >= 1) {
        this.fadeOutParticle(particle);
      }
    }
  }

  /**
   * Asymptotic easing function for organic vertical motion
   * Creates a curve where the particle quickly rises most of the way,
   * then gradually slows as it "settles" into the lane
   * 
   * IMPORTANT: Applied only to Y-axis (vertical motion)
   * X-axis stays linear to maintain synchronization with viewport scroll speed
   * 
   * Uses quadratic ease-out: subtle organic motion without lingering
   * 
   * @param t - Linear progress from 0 to 1
   * @returns Eased progress from 0 to 1 following smooth curve
   */
  private easeAsymptotic(t: number): number {
    // Quadratic ease-out formula: 1 - (1 - t)^2
    // Gentler than cubic - subtle deceleration without lingering:
    // - Slightly faster initial rise
    // - Smooth finish that completes promptly
    // - Just enough easing to feel organic without appearing slow
    return 1 - Math.pow(1 - t, 2);
  }

  /**
   * Spawn a particle by creating SVG elements
   * Creates nested group structure for transform-based animation
   * 
   * Visual encoding: Blue circle represents person joining, text label identifies who
   */
  private spawnParticle(particle: ParticleAnimation): void {
    // Outer group: positioned at final merge location (joinX, laneEdgeY)
    const particleContainer = this.particleGroup
      .append('g')
      .attr('class', 'particle-container')
      .attr('data-entity-name', particle.entityName)
      .attr('transform', `translate(${particle.joinX}, ${particle.laneEdgeY})`);

    // Inner animation group: starts offset (left and down), will animate to (0,0)
    const offsetX = -(particle.joinX - particle.spawnX); // Negative = left offset
    const offsetY = this.config.spawnOffsetY; // Positive = down offset

    const animationGroup = particleContainer
      .append('g')
      .attr('class', 'particle-animation')
      .attr('transform', `translate(${offsetX}, ${offsetY})`);

    // Circle at origin (0,0) within animation group
    animationGroup
      .append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', this.config.circleRadius)
      .attr('fill', this.config.circleColor);

    // Text label to the right of circle
    animationGroup
      .append('text')
      .attr('x', this.config.labelOffsetX)
      .attr('y', 4) // Vertical centering offset
      .attr('text-anchor', 'start')
      .attr('font-size', this.config.labelFontSize)
      .attr('font-family', this.config.labelFontFamily)
      .attr('fill', this.config.labelColor)
      .text(particle.entityName);

    // Store reference for animation
    particle.element = animationGroup;

    // Record animation intent - actual animation happens in update() loop
    this.animateParticle(particle);

    console.log(`✓ Spawned particle: ${particle.entityName}`);
  }

  /**
   * Record animation intent for RAF-based animation
   * Stores animation parameters - actual interpolation happens in update() loop
   * This allows animations to pause when auto-scroll pauses
   */
  private animateParticle(particle: ParticleAnimation): void {
    if (!particle.element) {
      console.error(`Cannot animate particle: element not created for ${particle.entityName}`);
      return;
    }

    // Calculate animation duration based on autoscroll speed
    const distance = this.spawnOffsetX;
    const speed = LAYOUT.autoScroll.speed;
    const duration = (distance / speed) * 1000;

    // Record animation parameters (don't start D3 transition)
    particle.animationStartTime = performance.now();
    particle.animationDuration = duration;
    particle.startTransform = {
      x: -(particle.joinX - particle.spawnX),
      y: this.config.spawnOffsetY
    };
  }

  /**
   * Fade out particle after animation completes
   * Fades entire particle container (circle + label) and removes from DOM
   */
  private fadeOutParticle(particle: ParticleAnimation): void {
    if (!particle.element) {
      return;
    }

    // Find the parent container (2 levels up from animation group)
    // particle.element is the animation group, parent is particle-container
    const container = d3.select(particle.element.node()?.parentNode as Element);

    // Fade out entire container
    container
      .transition()
      .duration(this.config.fadeOutDuration)
      .attr('opacity', 0)
      .on('end', () => {
        // Remove from DOM
        container.remove();

        // Mark particle complete and cleanup tracking
        particle.isComplete = true;
        this.activeParticles.delete(particle.entityName);
        this.completedJoins.add(particle.entityName);

        console.log(`✓ Particle animation complete: ${particle.entityName}`);
      });
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
    this.lastUpdateTime = 0; // Reset frame timing

    // Reset all particle metadata to initial state
    // This allows particles to spawn fresh after a reset
    for (const particle of this.particleMetadata.values()) {
      particle.hasSpawned = false;
      particle.isComplete = false;
      particle.element = undefined;
      particle.animationStartTime = undefined;
      particle.animationDuration = undefined;
      particle.startTransform = undefined;
    }

    console.log('Particle animations cleaned up');
  }
}

