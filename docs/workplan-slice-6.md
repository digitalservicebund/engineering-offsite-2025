# Slice 6 Implementation Plan: Particle Join Animations (People Only)

**Status:** Not Started  
**Created:** 2025-10-27  
**Updated:** 2025-10-27 (after design review)  
**Estimated Completion:** TBD

---

## Context Analysis

✅ **Already in place from Slices 1-5:**
- Timeline SVG with three lanes (projects, events, people) rendered
- D3 time scale (`xScale`) for date-to-position mapping
- Auto-scroll system at 200px/sec with `requestAnimationFrame` loop (forward only)
- ViewportController with continuous position tracking during scroll
- People lane rendered as dynamic path with variable width
- `ActiveCountCalculator` with timeline of join/departure dates
- `PeopleLanePathGenerator` with `getStrokeWidthAt(date)` method
- People lane width already increases automatically as scroll passes join dates (implemented in Slice 4)
- `onViewportChange` callback firing every frame during auto-scroll

❌ **Not yet implemented (needed for Slice 6):**
- Detection of upcoming person joins during forward auto-scroll
- Particle spawn logic (blue circles with text labels)
- Diagonal particle animation (upward-right motion from below lane to merge point)
- Fade-out animation after particle reaches lane
- Cleanup of completed particle animations
- Management of simultaneous particles (multiple joins close together)

🔍 **Key architectural decisions:**
- Particles spawn to the LEFT of join date (1/3 pixelsPerYear offset) and animate diagonally upward-right
- Spawn Y-position calculated from BOTTOM edge of people lane (not center), accounting for current lane width
- Particles are SVG `<g>` elements with transform animation (both X and Y)
- Animation triggered based on viewport position during forward auto-scroll
- Track "active" particles to avoid spawning duplicates during same scroll session
- Particles are temporary (created and destroyed during animation)
- Lane width increment already works (no changes needed to Slice 4 logic)
- **SIMPLIFIED:** Backward scrolling removed - Left Arrow now resets timeline to start

---

## Detailed Task Breakdown

### Phase 1: Configuration & Types
**Status:** ✅ Complete

**Task 1.1: Add particle animation configuration to `config.ts`** ✅ DONE 
- Add particle animation settings:
  ```typescript
  particleAnimations: {
    people: {
      spawnOffsetY: 60, // px - vertical distance below people lane bottom edge where particle starts
      // Note: spawnOffsetX calculated at runtime as LAYOUT.timeline.pixelsPerYear / 3
      animationDuration: 500, // ms - 0.5s diagonal animation per spec
      animationEasing: 'ease-out' as const, // Easing for upward-right motion
      fadeOutDuration: 300, // ms - fade duration after reaching lane
      circleRadius: 8, // px - particle circle size
      circleColor: '#4A90E2', // Blue - matches people lane color
      labelOffsetX: 15, // px - text position to right of circle
      labelFontSize: 11, // px - matches event marker labels
      labelFontFamily: 'sans-serif' as const,
      labelColor: '#2C3E50', // Matches text color
    },
  }
  ```
- **Rationale:** Centralizes all particle animation parameters for easy tuning during testing. Spawn offset X is computed dynamically based on pixelsPerYear.

**Task 1.2: Add types for particle tracking** ✅ DONE
- Add to `types.ts`:
  ```typescript
  export interface ParticleAnimation {
    id: string; // Unique identifier (e.g., 'particle-Alice-join' using person name)
    personName: string; // Person's name (also serves as unique ID - no duplicates in data)
    joinDate: Date;
    joinX: number; // x-position where particle should merge (join date position)
    spawnX: number; // x-position where particle spawns (joinX - pixelsPerYear/3)
    laneBottomY: number; // y-position of people lane bottom edge at join date
    hasSpawned: boolean; // true when particle element created
    isComplete: boolean; // true when animation finished and cleaned up
  }
  ```
- **Rationale:** Tracks particle lifecycle. Uses person name as ID since data has no duplicates. Stores both spawn and target positions for diagonal animation.

---

### Phase 2: Particle Detection & Viewport Height Check
**Status:** Not Started

**Task 2.1: Create `ParticleAnimationController` class in new file `particle-animation-controller.ts`**
- Responsibility: Manage particle lifecycle during forward auto-scroll
- Constructor parameters:
  - `svg: d3.Selection<SVGSVGElement>` - where to append particles
  - `xScale: d3.ScaleTime<number, number>` - for x-positioning
  - `people: Person[]` - person data with join dates
  - `peopleLanePathGenerator: PeopleLanePathGenerator` - for calculating lane width at join dates
  - `peopleLaneCenterY: number` - y-position of people lane centerline
- Private properties:
  - `activeParticles: Map<string, ParticleAnimation>` - tracks particles in progress
  - `completedJoins: Set<string>` - person names whose join animations completed (prevents duplicates)
  - `particleGroup: d3.Selection<SVGGElement>` - SVG group for all particles
  - `spawnOffsetX: number` - computed as `LAYOUT.timeline.pixelsPerYear / 3`
- Public methods:
  - `update(currentViewportX: number): void` - called every frame during auto-scroll
  - `cleanup(): void` - remove all particle elements (e.g., on timeline reset)
- **Design pattern:** Controller pattern - owns particle state and orchestrates lifecycle
- **Rationale:** Encapsulates complex particle logic in dedicated class, keeping Timeline and ViewportController clean.

**Task 2.2: Precompute viewport height validation**
- In constructor, calculate lowest possible spawn point:
  ```typescript
  // Worst case: all people active simultaneously
  const maxPeopleCount = people.length;
  const maxLaneWidth = LAYOUT.lanes.people.baseStrokeWidth + 
                        (maxPeopleCount * LAYOUT.lanes.people.pixelsPerPerson);
  const maxBottomEdgeY = peopleLaneCenterY + (maxLaneWidth / 2);
  const lowestSpawnY = maxBottomEdgeY + LAYOUT.particleAnimations.people.spawnOffsetY;
  
  // Check against viewport
  if (lowestSpawnY > LAYOUT.viewport.height) {
    console.warn(
      `⚠️ Particles may spawn off-screen! Lowest spawn: ${lowestSpawnY}px, ` +
      `viewport: ${LAYOUT.viewport.height}px. Consider reducing spawnOffsetY.`
    );
  } else {
    console.log(`✓ Viewport height OK: ${LAYOUT.viewport.height - lowestSpawnY}px margin`);
  }
  ```
- With current config (~60 people max): 771px spawn, 800px viewport → 29px margin ✓
- **Rationale:** Validate canvas dimensions at initialization to prevent off-screen particles.

**Task 2.3: Pre-calculate particle metadata for all people**
- In constructor, build lookup map with all particle spawn data:
  ```typescript
  this.particleMetadata = new Map<string, ParticleAnimation>();
  
  for (const person of people) {
    const joinX = xScale(person.joined);
    const spawnX = joinX - this.spawnOffsetX;
    
    // Calculate lane width at join date to find bottom edge
    const laneWidthAtJoin = peopleLanePathGenerator.getStrokeWidthAt(person.joined);
    const laneBottomY = peopleLaneCenterY + (laneWidthAtJoin / 2);
    
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
  ```
- **Key:** Calculate bottom edge Y using actual lane width at join date (accounts for previous joins)
- **Rationale:** Pre-calculation avoids expensive lookups during 60fps animation loop.

**Task 2.4: Implement particle detection logic**
- In `update(currentViewportX: number)` method:
  ```typescript
  Algorithm:
  1. For each person's particle metadata:
     a. Skip if already in completedJoins set (animation done this session)
     b. Calculate detection window: [spawnX - 50px, spawnX + 50px]
        (buffer prevents missing spawn due to frame jumps)
     c. If currentViewportX is within detection window:
        - Check if particle already active (in activeParticles map)
        - If not active: add to activeParticles map
        - Mark hasSpawned = false (will spawn in next check)
     d. If currentViewportX >= spawnX and !hasSpawned:
        - Call spawnParticle(particle) to create SVG elements
        - Mark hasSpawned = true
  ```
- Detection window (50px) prevents missed spawns if frames skip over exact spawnX
- **Critical:** Use `currentViewportX` (viewport position marker at 75%), not raw scroll offset
- **Rationale:** Robust detection that handles variable frame rates and timing.

---

### Phase 3: Particle Spawning & Early Integration
**Status:** Not Started  
**🎯 INTEGRATION POINT:** Test static particles visually before implementing animation

**Task 3.1: Create particle SVG group on initialization**
- In constructor, append SVG group for particles:
  ```typescript
  this.particleGroup = svg.append('g')
    .attr('class', 'particle-animations')
    .attr('pointer-events', 'none'); // Particles don't capture mouse events
  ```
- Group keeps particles organized (easier cleanup)
- **Rationale:** Separate layer for animation elements.

**Task 3.2: Implement `spawnParticle(particle: ParticleAnimation)` method using group transform**
- Create nested group structure for transform-based animation:
  ```typescript
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
  ```
- **Visual encoding:** Blue circle represents person joining, text label identifies who
- **Transform structure:** Outer group at merge point, inner group offset for animation
- **Rationale:** Clean animation via single transform (both X and Y) rather than individual coordinate updates.

**Task 3.3: Integrate with ViewportController and test static particles**
- **At this point:** Implement Tasks 6.1-6.4 (integration) so particles spawn but DON'T animate yet
- Add console.log in spawnParticle: `console.log(\`✓ Spawned particle: ${particle.personName}\`);`
- **Manual testing:** Start auto-scroll, verify particles appear at correct positions
- Check: particle circle visible, label readable, positioned correctly relative to lane
- **Expected:** Static particles appear to the left and below merge point during scroll
- **Rationale:** Early visual feedback allows manual testing before animation complexity.

**Task 3.4: Handle spawn position edge cases**
- If `spawnX < 0` (join date very early in timeline):
  - Clamp to `spawnX = 0` (particles spawn at timeline start)
  - Animation still targets correct joinX (may appear to move extra distance)
- If `particle.laneBottomY + spawnOffsetY > viewport.height`:
  - Already checked in Task 2.2, but add runtime warning if encountered
- **Rationale:** Defensive handling of edge cases without breaking animation system.

---

### Phase 4: Particle Animation (Diagonal Upward-Right Motion)
**Status:** Not Started

**Task 4.1: Implement `animateParticle(particle: ParticleAnimation)` method**
- Animate the inner animation group's transform from offset to (0,0):
  ```typescript
  private animateParticle(particle: ParticleAnimation): void {
    if (!particle.element) {
      console.error(`Cannot animate particle: element not created for ${particle.personName}`);
      return;
    }
    
    // Animate transform from current offset to (0, 0) = merge position
    particle.element
      .transition()
      .duration(LAYOUT.particleAnimations.people.animationDuration)
      .ease(d3.easeOut)
      .attr('transform', 'translate(0, 0)')
      .on('end', () => {
        // Animation complete - start fade-out
        this.fadeOutParticle(particle);
      });
  }
  ```
- Single transform animates both X (left→right) and Y (down→up) simultaneously
- Creates diagonal upward-right motion
- Use `.on('end')` callback to chain to fade-out phase
- **Rationale:** Clean, GPU-accelerated transform animation. Perfectly synchronized motion for circle + label.

**Task 4.2: Call animation immediately after spawning**
- In `spawnParticle` method, after creating SVG elements:
  ```typescript
  // ...create SVG elements...
  
  // Start animation immediately
  this.animateParticle(particle);
  ```
- No delay between spawn and animation start
- **Rationale:** Spec says particles animate as soon as they appear.

**Task 4.3: Test animation smoothness**
- Verify 60fps during particle animation + auto-scroll
- Check that D3 transitions don't conflict with auto-scroll RAF loop
- Monitor DevTools Performance tab for frame drops
- **Expected behavior:** Smooth diagonal motion with ease-out curve
- Visual inspection: Particle moves from bottom-left to top-right of its travel path
- **Rationale:** Performance validation ensures good presentation experience.

---

### Phase 5: Fade-Out & Cleanup
**Status:** Not Started

**Task 5.1: Implement `fadeOutParticle(particle: ParticleAnimation)` method**
- Fade out the entire particle container (circle + text together):
  ```typescript
  private fadeOutParticle(particle: ParticleAnimation): void {
    if (!particle.element) {
      return;
    }
    
    // Find the parent container (2 levels up from animation group)
    const container = d3.select(particle.element.node()?.parentNode?.parentNode as Element);
    
    // Fade out entire container
    container
      .transition()
      .duration(LAYOUT.particleAnimations.people.fadeOutDuration)
      .attr('opacity', 0)
      .on('end', () => {
        // Remove from DOM
        container.remove();
        
        // Mark particle complete and cleanup tracking
        particle.isComplete = true;
        this.activeParticles.delete(particle.personName);
        this.completedJoins.add(particle.personName);
        
        console.log(`✓ Particle animation complete: ${particle.personName}`);
      });
  }
  ```
- Fades entire particle (circle + label) as a unit
- Callback removes particle from DOM and updates tracking state
- **Rationale:** Fade provides visual feedback that particle has "merged" into lane.

**Task 5.2: Implement `cleanup()` method for timeline reset**
- Interrupt all transitions and remove all particles:
  ```typescript
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
  ```
- Call `cleanup()` when:
  - User presses Left Arrow (reset timeline to start)
  - Page unload / re-initialization
- **Rationale:** Prevents memory leaks from orphaned transition callbacks. Allows fresh start when resetting timeline.

---

### Phase 6: Integration with ViewportController
**Status:** Not Started  
**⚠️ NOTE:** Partially completed during Phase 3, Task 3.3 for early testing

**Task 6.1: Add `getSvg()` getter to Timeline class**
- Expose SVG selection for particle controller:
  ```typescript
  public getSvg(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
    return this.svg;
  }
  ```
- Simple getter, no logic needed
- **Rationale:** Encapsulation - Timeline owns SVG but provides controlled access.

**Task 6.2: Instantiate `ParticleAnimationController` in `main.ts`**
- After timeline render and people lane path generator, create particle controller:
  ```typescript
  const particleAnimationController = new ParticleAnimationController(
    timeline.getSvg(),
    timeline.getXScale(),
    data.people,
    peopleLanePathGenerator, // Pass existing instance for width calculations
    LAYOUT.lanes.people.yPosition
  );
  ```
- Store reference for particle updates and cleanup
- **Rationale:** Particle controller needs access to SVG and lane width calculator.

**Task 6.3: Add particle update callback to ViewportController**
- Add `onParticleUpdate?: (currentPositionX: number) => void` to constructor parameters
- In `autoScrollLoop()` method, after counter update (step 8):
  ```typescript
  // Step 8.5: Update particle animations
  if (this.onParticleUpdate) {
    const currentPositionX = this.currentOffset + this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
    this.onParticleUpdate(currentPositionX);
  }
  ```
- **Rationale:** Separate callback for particle updates keeps concerns separated from counter updates.

**Task 6.4: Wire up particle update callback in `main.ts`**
- Create callback function:
  ```typescript
  const updateParticles = (currentPositionX: number): void => {
    particleAnimationController.update(currentPositionX);
  };
  ```
- Pass to ViewportController constructor (add as last parameter):
  ```typescript
  const viewportController = new ViewportController(
    container,
    timeline.getTimelineWidth(),
    timeline.getXScale(),
    timeline.getStartDate(),
    timeline.getEndDate(),
    keyEventPositions,
    updateCounters,
    handleKeyEventReached,
    updateParticles // New callback
  );
  ```
- **Rationale:** Clean integration point for particle updates during scroll.

---

### Phase 7: Remove Backward Scrolling & Implement Timeline Reset
**Status:** Not Started  
**🎯 SIMPLIFICATION:** Eliminates particle re-spawn complexity

**Task 7.1: Remove backward auto-scroll from ViewportController**
- Remove backward scroll logic from `checkForKeyEventPause()`:
  - Only check for forward key events
  - Remove backward direction handling
- Simplify `startAutoScroll()` to only accept 'forward':
  ```typescript
  public startAutoScroll(): void {
    // Always forward, no direction parameter
    this.scrollState = 'scrolling';
    this.scrollDirection = 'forward';
    // ...rest of implementation
  }
  ```
- Remove `scrollDirection` type from being 'backward' | 'forward' (just always 'forward')
- **Rationale:** Backward scrolling adds complexity without value for presentation use case.

**Task 7.2: Implement timeline reset to start**
- Add `resetToStart()` method to ViewportController:
  ```typescript
  public resetToStart(): void {
    // Stop any active auto-scroll
    this.stopAutoScroll();
    
    // Reset to initial position
    this.currentOffset = this.minOffset;
    this.applyTransform(false); // Instant, no transition
    
    // Update counters at start position
    this.notifyViewportChange();
    
    console.log('Timeline reset to start');
  }
  ```
- **Rationale:** Clean slate for presenter to restart presentation.

**Task 7.3: Update keyboard controls in `main.ts` for Left Arrow**
- Modify `handleKeyDown` function:
  ```typescript
  // Handle Left arrow - reset to timeline start
  if (key === 'ArrowLeft') {
    event.preventDefault();
    
    // Clean up particle animations
    particleAnimationController.cleanup();
    
    // Reset viewport to start
    viewportController.resetToStart();
    
    // Clear event highlights
    timeline.highlightEvent(null);
    
    return;
  }
  ```
- Remove all backward scroll logic (direction reversals, etc.)
- **Rationale:** Simple reset behavior easy for presenter to understand.

**Task 7.4: Clean up types and remove backward direction**
- In `types.ts`, simplify or remove `ScrollDirection`:
  - Either keep as `type ScrollDirection = 'forward'` (single value)
  - Or remove entirely if not needed
- Update any references to `scrollDirection` in ViewportController
- **Rationale:** Code cleanup - remove unused complexity.

---

### Phase 8: Multiple Simultaneous Particles & Polish
**Status:** Not Started

**Task 8.1: Test with close-together join dates**
- Data has multiple people joining on same day (e.g., "Pers B" and "Pers C" on 2020-12-01)
- Verify multiple particles can spawn and animate simultaneously
- Check for visual overlap (particles too close together)
- **Expected behavior:** All particles visible, animations don't interfere
- **Potential issue:** Text labels might overlap if joins are same day
- **Rationale:** Success criteria explicitly mentions "multiple particles can animate simultaneously."

**Task 8.2: Add label collision detection (if time permits)**
- If multiple particles spawn at same x-position:
  - Stagger vertically: second particle starts at `spawnOffsetY + 20px`
  - Or stagger horizontally: second particle starts at `spawnX + 40px`
- **Decision:** Skip for MVP unless overlap is severe
- Prototype can tolerate some visual overlap
- **Rationale:** Nice-to-have feature, not critical for presentation.

**Task 8.3: Visual polish**
- Verify particle color matches people lane (#4A90E2)
- Check label font size and positioning (readable, not overlapping circle)
- Ensure fade-out is smooth (not abrupt)
- Verify animation timing feels natural (not too fast/slow)
- **Adjustments if needed:**
  - Tweak spawn offset if timing feels off
  - Adjust label position if overlapping with circle
  - Change fade duration if transition too abrupt
- **Rationale:** Prototype is for presentation - visuals must feel polished.

---

### Phase 9: Spawn Timing Validation
**Status:** Not Started

**Task 9.1: Validate spawn offset calculation**
- Spec says: "Blue circle starting 60px below people lane and 1/3 of LAYOUT.timeline.pixelsPerYear _before_ the join date is reached"
- With `pixelsPerYear = 800px`: spawn offset X = 800 / 3 ≈ 267px
- Verify visual timing:
  - At 200px/sec scroll speed: 267px ≈ 1.33 seconds before merge point
  - 0.5s animation + 0.3s fade = 0.8s total duration
  - Particle completes ~0.5s before viewport center crosses join date
- **Expected:** Particle reaches lane just as viewport center crosses join date
- **Adjustment if needed:** Fine-tune spawn offset to match visual expectations
- **Rationale:** Timing must feel natural for presentation - animation completes at "right moment."

**Task 9.2: Verify "circle merges at exactly the x-position of the join date"**
- Success criteria states: "Blue particle merges with people lane exactly at the x-position of the join date"
- Test procedure:
  1. Add temporary visual marker at join date position
  2. Watch particle animate during auto-scroll
  3. Verify particle's final position (before fade-out) aligns with join date marker
- **Expected:** Particle's final x-position matches join date x-position visually
- **Validation:** Transform animation should place particle exactly at `(joinX, laneBottomY)` = `translate(0, 0)` in container group
- **Rationale:** Validates core animation requirement - visual alignment.

---

### Phase 10: Comprehensive Testing & Validation
**Status:** Not Started

**Task 10.1: Test particle spawn with first person join**
- Start at beginning of timeline (2020-01-01)
- Press Space to start auto-scroll
- First join in data is "Pers A" on 2020-11-16
- ✓ Blue particle should appear ~267px before join date position
- ✓ Particle should have label "Pers A"
- ✓ Particle should animate diagonally upward-right
- ✓ Particle should fade out after reaching lane
- ✓ People lane width should be 4px (2 base + 1 person × 2px) after join

**Task 10.2: Test multiple particles with same-day joins**
- Data has "Pers B" and "Pers C" both joining on 2020-12-01
- ✓ Two particles should spawn (almost) simultaneously
- ✓ Both should animate diagonally upward-right
- ✓ Labels should be readable (check for overlap)
- ✓ People lane width should jump to 8px (2 + 3 people × 2px)
- **Edge case:** If labels overlap severely, might need Task 8.2 (collision detection)

**Task 10.3: Test particles during key event pause**
- Auto-scroll should pause at key events
- If person join occurs near pause point:
  - Existing particles should complete their animations
  - No new particles spawn while paused (detection only runs during active scroll)
  - Lane width still updates (driven by `onViewportChange` callback, not particles)
- ✓ No particles spawn while paused
- ✓ Particles resume spawning when auto-scroll resumes
- **Rationale:** Validates that particle detection correctly checks scroll state.

**Task 10.4: Test timeline reset (Left Arrow)**
- Scroll forward past several joins
- Press Left Arrow
- **Expected behavior:**
  - Auto-scroll stops
  - All active particles are cleaned up (removed from DOM)
  - Timeline resets to start position instantly
  - Counters reset to initial values
- Press Space again to restart:
  - ✓ Particles spawn again for same joins (completedJoins cleared)
  - ✓ All animations work correctly on second pass
- **Rationale:** Tests reset functionality and verifies clean state on restart.

**Task 10.5: Test particle cleanup**
- Scroll through entire timeline
- All particles should complete and remove themselves
- Check DOM: no orphaned particle elements
- Use DevTools Elements tab: search for `.particle-container` class
- ✓ No particle elements remain after animations complete
- **Rationale:** Ensures no memory leaks or DOM bloat.

**Task 10.6: Performance testing with many joins**
- Data has ~60 people joining over 5 years
- Average ~12 joins per year
- At 200px/sec, ~4 seconds per year
- Average ~3 joins per second (peak: 5-6 joins/sec when multiple same-day joins)
- ✓ Auto-scroll maintains 60fps with particles animating
- ✓ No jank or stuttering
- ✓ All particles spawn and complete successfully
- Monitor DevTools Performance tab during full timeline scroll
- **Rationale:** Validates system handles realistic data volume.

**Task 10.7: Test spawn Y-position with lane growth**
- Verify particles spawn from bottom edge of lane, not center
- Early joins (few people): particles spawn from ~652px (650 center + 2px)
- Later joins (many people): particles spawn progressively lower as lane grows
- ✓ All particles spawn below their respective lane width
- ✓ No particles appear to "penetrate" the lane
- **Rationale:** Validates bottom-edge calculation works correctly.

---

## Success Criteria Checklist

### Core Particle Animation
- [ ] Blue particles (8px radius) spawn during forward auto-scroll
- [ ] Particles spawn 1/3 of pixelsPerYear (~267px) LEFT of join date position
- [ ] Particles start 60px below people lane BOTTOM EDGE (accounts for lane width)
- [ ] Particles animate diagonally upward-right to merge point over 0.5s with ease-out
- [ ] Circle and label move together as a group (transform animation)
- [ ] Particle color matches people lane (#4A90E2)

### Labels & Positioning
- [ ] Text label shows person's name
- [ ] Label positioned 15px to right of circle
- [ ] Label uses 11px sans-serif font
- [ ] Labels are readable (not cut off or obscured)
- [ ] Blue particle merges with people lane exactly at x-position of join date

### Animation Completion
- [ ] Both circle and label fade out (opacity 1 → 0) after reaching lane
- [ ] Fade-out duration is smooth (not abrupt)
- [ ] Particle elements removed from DOM after fade completes
- [ ] People lane width increases by 2px after particle merges (already working from Slice 4)

### Multiple Particles
- [ ] Multiple particles can animate simultaneously if joins are close together
- [ ] Tested with 2-3 simultaneous particles (same-day joins in data)
- [ ] No visual glitches or severe overlap issues

### Integration with Auto-Scroll
- [ ] Particles only spawn during active forward auto-scroll (not during pause)
- [ ] Particles spawn at correct timing relative to viewport position marker (75%)
- [ ] Particles continue animating if scroll pauses mid-animation (D3 transitions independent)
- [ ] Backward scrolling removed - Left Arrow resets timeline to start

### Performance & Cleanup
- [ ] No console errors during particle animations
- [ ] Auto-scroll maintains 60fps with particles animating
- [ ] Particle elements cleaned up after animation completes
- [ ] No memory leaks from orphaned transitions or DOM elements
- [ ] Works with realistic data volume (~60 people over 5 years)
- [ ] Viewport height check passes (particles don't spawn off-screen)

### Timeline Reset
- [ ] Left Arrow key stops auto-scroll and resets timeline to start
- [ ] All active particles cleaned up on reset
- [ ] Counters reset to initial values
- [ ] Can restart timeline after reset (particles spawn again correctly)

### Code Quality
- [ ] No TypeScript errors or `any` types
- [ ] Configuration values in `config.ts`, not hardcoded (except spawnOffsetX computed at runtime)
- [ ] Particle controller encapsulates all particle logic
- [ ] Clean separation of concerns (Timeline, ViewportController, ParticleAnimationController)
- [ ] Code is commented with visual encoding documentation
- [ ] Backward scrolling logic removed from ViewportController

---

## Technical Decisions

### 1. Animation implementation: D3 transitions vs. CSS animations
**Decision:** Use D3 transitions for particle motion  
**Rationale:**  
- D3 transitions integrate well with existing D3-based rendering
- Programmatic control over start/stop/cleanup
- Event hooks (`.on('end')`) for chaining animation phases
- CSS animations harder to trigger dynamically based on scroll position
- Matches animation approach used in Slice 4 (lane width transitions)
- Single transform animates both X and Y coordinates simultaneously

### 2. Particle spawn trigger: proactive detection vs. reactive
**Decision:** Proactive detection with 50px spawn window  
**Rationale:**  
- Detection window ([spawnX - 50px, spawnX + 50px]) prevents missed spawns
- At 200px/sec @ 60fps: ~3.33px per frame average
- 50px buffer provides ~15 frame margin for reliable detection
- Reactive approach (spawn when viewport crosses exact spawnX) risks missing spawn if frame jumps
- Trade-off: Slightly more complex detection logic, but more robust across frame rate variations

### 3. Particle positioning: diagonal vs. vertical-only
**Decision:** Diagonal animation (both X and Y transform)  
**Rationale:**  
- Particles spawn 1/3 pixelsPerYear LEFT of merge point (~267px offset)
- Animate both horizontally (left→right) and vertically (down→up) to merge point
- Creates visually interesting diagonal upward-right motion
- Meets success criterion: "particle merges at exactly the x-position of the join date"
- Transform-based animation GPU-accelerated and performant

### 4. Particle grouping: nested groups with transform animation
**Decision:** Use nested SVG `<g>` elements with transform for animation  
**Rationale:**  
- Outer group positioned at final merge location (joinX, laneBottomY)
- Inner group starts offset and animates to (0, 0) via transform
- Single transform animates both X and Y simultaneously
- Perfect synchronization of circle + text (they're children of animated group)
- Cleaner than animating individual `cx`, `cy`, `x`, `y` attributes
- GPU-accelerated performance

### 5. Spawn Y-position: center vs. bottom edge of lane
**Decision:** Calculate spawn Y from BOTTOM edge of people lane  
**Rationale:**  
- Lane width varies (2px at start → 122px at end with 60 people)
- Particles should appear to "rise into" lane, not float from arbitrary position
- Calculate: `laneBottomY = laneCenterY + (laneWidthAtJoin / 2)`
- Spawn: `laneBottomY + 60px`
- Uses existing `getStrokeWidthAt()` method from people lane path generator
- Visually correct as lane grows thicker over time

### 6. Viewport height validation: runtime vs. design-time
**Decision:** Precompute worst-case spawn point at initialization  
**Rationale:**  
- Calculate maximum lane width assuming all people active simultaneously
- Check if lowest spawn point exceeds viewport height
- Warn at initialization rather than discovering issue during presentation
- Current config: 771px max spawn vs. 800px viewport = 29px margin ✓
- Allows adjusting `spawnOffsetY` if needed before data becomes problem

### 7. Backward scrolling: bidirectional vs. forward-only
**Decision:** Remove backward scrolling entirely; Left Arrow resets to start  
**Rationale:**  
- Backward scrolling requires complex particle re-spawn logic
- Particles would need to "un-merge" and animate backward (confusing)
- Or skip particles when scrolling backward (inconsistent)
- Presentation use case: presenter scrolls forward, resets if needed
- Simpler UX: Left Arrow = instant reset to beginning
- Eliminates entire class of complexity and edge cases

### 8. Particle lifecycle: one-time vs. repeatable
**Decision:** One-time animations within scroll session, reset on Left Arrow  
**Rationale:**  
- During scroll session: particle animation triggers once per person join
- `completedJoins` Set prevents duplicate animations
- On reset (Left Arrow): clear all state, particles can spawn again
- Matches "storytelling" metaphor: present timeline once, reset for next presentation
- Simpler than tracking partial state during backward scroll

### 9. Particle tracking: person ID vs. person name
**Decision:** Use person name as unique identifier  
**Rationale:**  
- Data has no `id` field on people objects
- Person names are unique in dataset (verified)
- Use `person.name` as Map key for particle tracking
- Simpler than generating synthetic IDs
- Direct mapping: particle ID = `"particle-${person.name}"`

### 10. Integration point: separate callback vs. existing callback
**Decision:** Add `onParticleUpdate` callback to ViewportController  
**Rationale:**  
- Separation of concerns - particle updates distinct from counter updates
- Different parameter type: `currentPositionX` (number) vs. `centerDate` (Date)
- Allows independent enabling/disabling of particle system
- Clean separation makes testing/debugging easier
- Slightly more callbacks, but clearer architecture

---

## Estimated Complexity

### Development Time Estimates:

- **Phase 1 (Configuration & Types):** ~15-20 minutes
  - Config additions: 10 min
  - Type definitions: 5-10 min

- **Phase 2 (Particle Detection & Viewport Check):** ~50-65 minutes
  - ParticleAnimationController class structure: 15 min
  - Viewport height validation: 10 min
  - Pre-calculation with bottom edge: 15-20 min
  - Detection logic with spawn window: 15-20 min

- **Phase 3 (Particle Spawning & Early Integration):** ~60-75 minutes ⭐
  - SVG group creation: 5 min
  - spawnParticle() with nested groups: 20-25 min
  - **Early integration (Tasks 6.1-6.4):** 25-30 min
  - Edge case handling: 5-10 min
  - **Manual testing of static particles:** 10-15 min

- **Phase 4 (Particle Animation):** ~30-40 minutes
  - D3 transform transition: 15-20 min
  - Call animation after spawn: 5 min
  - Animation smoothness testing: 10-15 min

- **Phase 5 (Fade-Out & Cleanup):** ~25-30 minutes
  - Fade-out transition: 10-15 min
  - Cleanup method: 10-15 min
  - Memory leak prevention: 5 min

- **Phase 6 (Integration - remaining):** ~5-10 minutes
  - Already mostly done in Phase 3
  - Final wiring verification: 5-10 min

- **Phase 7 (Remove Backward Scrolling):** ~30-40 minutes
  - Remove backward logic from ViewportController: 15-20 min
  - Implement reset method: 10 min
  - Update keyboard controls: 10-15 min
  - Clean up types: 5 min

- **Phase 8 (Multiple Particles & Polish):** ~30-40 minutes
  - Test close-together joins: 10-15 min
  - Collision detection (if needed): 10-15 min
  - Visual polish: 10-15 min

- **Phase 9 (Timing Validation):** ~20-25 minutes
  - Validate spawn offset: 10-15 min
  - Verify merge alignment: 10 min

- **Phase 10 (Comprehensive Testing):** ~60-90 minutes
  - Test first particle: 10 min
  - Test multiple simultaneous: 10 min
  - Test during pause: 10 min
  - Test reset (Left Arrow): 10 min
  - Test cleanup: 10 min
  - Performance testing: 15-20 min
  - Test spawn Y-position: 10 min
  - Bug fixes: varies

**Total Estimated Time:** ~5-6.5 hours

**Complexity Assessment:**
- **High complexity:** Particle detection with bottom-edge calculation (Phase 2), nested group transforms (Phase 3)
- **Medium complexity:** D3 animation coordination (Phase 4), viewport controller integration (Phase 3), backward scroll removal (Phase 7)
- **Low complexity:** Configuration, types, fade-out, testing

**Risk areas:**
- Bottom-edge Y calculation (must account for varying lane width correctly)
- Nested group transform structure (outer + inner groups, proper coordinate spaces)
- Particle spawn timing (detection window must be tuned correctly)
- Multiple simultaneous particles (label overlap, performance)
- Memory management (cleanup of completed particles)
- Reset functionality (ensuring clean state for restart)

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-002:** Particle Join Animations
  - "When person joins: blue circle (8px radius) animates from below into people lane"
  - "Start position: 60px below lane"
  - "Duration: 0.5s ease-out"
  - "Text label with person's name positioned 15px to the right of circle"
  - "Circle and label move together"
  - "Both dissolve (opacity 1 → 0) after reaching lane"

### User Stories:
- **US-003:** Growth Visualization with Join Animations
  - "When person joins: blue particle (8px circle) animates from below into people lane over 0.5s"
  - "Particle displays person's name as text label during animation"
  - "Particle and label disappear after merging into lane"

### Data Model:
- **Section 3.1:** Input JSON Schema
  - People array with `joined` dates (triggers particle spawn)
  - Person has `name` field (displayed on particle label)

### UI Specifications:
- **Section 4.2:** Color Palette
  - People Lane color: `#4A90E2` (Blue) - matches particle circle color

- **Section 4.4:** Animation Timings
  - Particle join: 0.5s ease-out

### Prompt Slice 6:
- "Blue circle (8px radius) starting 60px below people lane and 1/3 of LAYOUT.timeline.pixelsPerYear _before_ the join date is reached"
- "Text label with person.name positioned 15px to right of circle"
- "Animate upward to people lane over 0.5s (ease-out)"
- "Circle and label move together as a group"
- "Circle joins lane at exactly the x-position of the join date"
- "On animation completion: Fade out both circle and label (opacity 1 → 0)"
- "Trigger people lane width increment by 1px" (already implemented in Slice 4)
- "Multiple particles can animate simultaneously if joins are close together"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slices 1-5 complete (timeline, viewport, counters, lane width, auto-scroll)
- ✅ Auto-scroll system with requestAnimationFrame loop
- ✅ ViewportController tracking current viewport position
- ✅ People data with join dates
- ✅ xScale for date-to-position conversion
- ✅ People lane rendering (path with dynamic width)
- ✅ Lane width increase system (already triggers at join dates)

**No new external dependencies needed:**
- All functionality uses D3 (already imported)
- D3 transitions for animation
- Native browser APIs for DOM manipulation

**Compatibility:**
- D3 transitions: Core D3 feature, well-supported
- SVG groups and transforms: Standard SVG, all modern browsers
- RequestAnimationFrame: Already used in Slice 5

---

## Implementation Notes

### Code organization:
```
src/
├── main.ts                           # (Modified) Instantiate ParticleAnimationController, wire callback
├── timeline.ts                       # (Modified) Add getSvg() getter
├── viewport-controller.ts            # (Modified) Add onParticleUpdate callback, call in autoScrollLoop
├── particle-animation-controller.ts  # (New) Manage particle lifecycle during auto-scroll
├── config.ts                         # (Modified) Add particle animation configuration
├── types.ts                          # (Modified) Add ParticleAnimation interface
└── style.css                         # (Unchanged) No new styles needed (D3 handles animation)
```

### Key classes/methods to add:

**In particle-animation-controller.ts:**
```typescript
export class ParticleAnimationController {
  private activeParticles: Map<string, ParticleAnimation>; // Key: person name
  private completedJoins: Set<string>; // Person names that have animated
  private particleGroup: d3.Selection<SVGGElement>;
  private particleMetadata: Map<string, ParticleAnimation>; // Pre-calculated spawn data
  private spawnOffsetX: number; // Computed from pixelsPerYear / 3
  private readonly peopleLanePathGenerator: PeopleLanePathGenerator;
  private readonly peopleLaneCenterY: number;
  
  constructor(
    svg: d3.Selection<SVGSVGElement>,
    xScale: d3.ScaleTime<number, number>,
    people: Person[],
    peopleLanePathGenerator: PeopleLanePathGenerator, // For calculating lane width
    peopleLaneCenterY: number
  ) { 
    // Validate viewport height (Task 2.2)
    // Pre-calculate particle metadata (Task 2.3)
  }
  
  public update(currentViewportX: number): void { ... } // Task 2.4
  private spawnParticle(particle: ParticleAnimation): void { ... } // Task 3.2
  private animateParticle(particle: ParticleAnimation): void { ... } // Task 4.1
  private fadeOutParticle(particle: ParticleAnimation): void { ... } // Task 5.1
  public cleanup(): void { ... } // Task 5.2
}
```

**In timeline.ts:**
```typescript
public getSvg(): d3.Selection<SVGSVGElement, unknown, null, undefined> {
  return this.svg;
}
```

**In viewport-controller.ts:**
```typescript
// Add to constructor parameters
onParticleUpdate?: (currentPositionX: number) => void

// Simplify startAutoScroll() - remove direction parameter (Task 7.1)
public startAutoScroll(): void {
  this.scrollState = 'scrolling';
  this.scrollDirection = 'forward'; // Always forward
  // ...
}

// Add resetToStart() method (Task 7.2)
public resetToStart(): void {
  this.stopAutoScroll();
  this.currentOffset = this.minOffset;
  this.applyTransform(false);
  this.notifyViewportChange();
}

// Add to autoScrollLoop() after step 8
// Step 8.5: Update particle animations
if (this.onParticleUpdate) {
  const currentPositionX = this.currentOffset + this.viewportWidth * LAYOUT.scroll.currentPositionRatio;
  this.onParticleUpdate(currentPositionX);
}
```

**In main.ts:**
```typescript
// After timeline render and people lane path generator
const particleAnimationController = new ParticleAnimationController(
  timeline.getSvg(),
  timeline.getXScale(),
  data.people,
  peopleLanePathGenerator, // Pass existing instance
  LAYOUT.lanes.people.yPosition
);

// Create particle update callback
const updateParticles = (currentPositionX: number): void => {
  particleAnimationController.update(currentPositionX);
};

// Update keyboard controls for Left Arrow (Task 7.3)
if (key === 'ArrowLeft') {
  event.preventDefault();
  particleAnimationController.cleanup();
  viewportController.resetToStart();
  timeline.highlightEvent(null);
  return;
}

// Pass to ViewportController (add as last parameter)
const viewportController = new ViewportController(
  container,
  timeline.getTimelineWidth(),
  timeline.getXScale(),
  timeline.getStartDate(),
  timeline.getEndDate(),
  keyEventPositions,
  updateCounters,
  handleKeyEventReached,
  updateParticles // New callback
);
```

### Potential gotchas:

1. **Bottom-edge Y calculation:** Must use lane width at JOIN date, not current date
   - Solution: Call `peopleLanePathGenerator.getStrokeWidthAt(person.joined)` for each person
   - Pre-calculate in constructor, not during animation loop
   
2. **Nested group coordinate spaces:** Outer group at merge point, inner group offset
   - Solution: offsetX = -(joinX - spawnX) to get negative (leftward) offset
   - offsetY = +spawnOffsetY for downward offset
   - Careful with signs when calculating transforms
   
3. **Spawn timing precision:** Detection window must account for frame rate variance
   - Solution: Use generous window (50px ~15 frames) to catch fast frames
   
4. **Multiple same-day joins:** Labels might overlap severely
   - Solution: Test with real data first, add collision detection only if needed
   
5. **D3 transition conflicts:** Multiple transitions on same element can interrupt
   - Solution: Use `.on('end')` callbacks to chain transitions (upward → fade-out)
   
6. **Memory leaks:** Orphaned particle elements or transition callbacks
   - Solution: Implement cleanup() method, call .interrupt() before removing elements
   
7. **Reset state:** Must clear completedJoins Set when resetting timeline
   - Solution: Call particleAnimationController.cleanup() on Left Arrow press
   
8. **Pause during animation:** Particle animation continues while scroll paused
   - Solution: Expected behavior - no special handling needed (transitions are independent)
   
9. **Very early join dates:** Spawn position might be off-screen left (spawnX < 0)
   - Solution: Clamp spawnX to 0, particle will travel extra distance to merge point
   
10. **Removing backward scrolling:** Must update all keyboard control logic
   - Solution: Remove direction reversals, implement simple reset to start

### Implementation order (recommended):

1. **Phase 1:** Configuration and types (foundation)
2. **Phase 2:** Particle detection with viewport validation (pre-calculate all metadata)
3. **Phase 3:** Particle spawning + **EARLY INTEGRATION** (static particles visible during scroll)
   - ⭐ **CHECKPOINT:** Test static particles manually before proceeding
4. **Phase 4:** Diagonal animation (add transform transition)
5. **Phase 5:** Fade-out and cleanup (complete lifecycle)
6. **Phase 6:** Verify final integration (mostly done in Phase 3)
7. **Phase 7:** Remove backward scrolling, implement reset
8. **Phase 8:** Multiple particles and visual polish
9. **Phase 9:** Timing validation (spawn offset, merge alignment)
10. **Phase 10:** Comprehensive testing and bug fixes

**Key principle:** Integrate early (Phase 3) for visual feedback, then iterate on animation quality.

### Debugging tips:

- Add console logging for particle lifecycle:
  ```typescript
  console.log(`Particle detected: ${particle.personName} at x=${particle.spawnX}`);
  console.log(`Particle spawned: ${particle.personName}`);
  console.log(`Particle animated: ${particle.personName}`);
  console.log(`Particle faded: ${particle.personName}`);
  ```
  
- Use browser DevTools Elements tab to inspect particle elements during animation
  
- Add temporary visual markers at spawn positions:
  ```typescript
  svg.append('circle')
    .attr('cx', spawnX)
    .attr('cy', peopleY)
    .attr('r', 3)
    .attr('fill', 'red'); // Debug marker
  ```
  
- Log viewport position vs. spawn position:
  ```typescript
  console.log(`Viewport: ${currentViewportX}, Spawn: ${spawnX}, Distance: ${spawnX - currentViewportX}`);
  ```
  
- Use Performance tab to verify 60fps during particle animations
  
- Check for orphaned elements:
  ```typescript
  console.log(`Active particles: ${particleGroup.selectAll('.particle').size()}`);
  ```

---

## Design Questions - RESOLVED ✓

All design questions have been resolved through design review:

1. **Particle horizontal positioning:** ✓ Diagonal animation - particles spawn LEFT of merge point and animate both X and Y
2. **Spawn Y-position:** ✓ Calculate from BOTTOM edge of people lane (accounts for varying lane width)
3. **Viewport height:** ✓ Precompute worst-case spawn point at initialization to validate canvas size
4. **Backward scrolling:** ✓ Removed entirely - Left Arrow resets timeline to start
5. **Person ID:** ✓ Use `person.name` as unique identifier (no `id` field in data)
6. **Transform approach:** ✓ Use Option B (group transform) for animation
7. **Lane width trigger:** ✓ Already works from Slice 4, no changes needed
8. **Early integration:** ✓ Integrate after Phase 3 for manual testing

---

**Last Updated:** 2025-10-27 (after design review)  
**Next Step:** Begin Phase 1 implementation


