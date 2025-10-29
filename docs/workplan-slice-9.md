# Slice 9 Implementation Plan: Particle Join Animations (Projects)

**Status:** Ready for Implementation  
**Created:** 2025-10-29  

---

## Summary

Implement project particle join animations by **generalizing and reusing the existing people particle animation architecture**. Green particles with project names animate downward from above the project lane when projects start during auto-scroll, mirroring the pattern already implemented for people particles (which animate upward).

**Key architectural principle:** Just as we generalized `LanePathGenerator<T>` in Slice 8, we'll make `ParticleAnimationController` generic or configurable to handle both people and project particles without code duplication.

---

## Context Analysis

### What's Already in Place (from previous slices):

**✅ Slice 6: People Particle Animations**
- `ParticleAnimationController` class in `src/particle-animation-controller.ts`
  - Spawn detection: Tracks viewport position, detects when scroll crosses person join dates
  - SVG creation: Creates circle + text label as nested group structure
  - Animation: RAF-based position interpolation with asymptotic easing
  - Fade-out: Opacity transition after reaching lane
  - Cleanup: Removes completed particle elements
- Configuration in `LAYOUT.particleAnimations.people`
- Integration in `main.ts`: Instantiated with people data, hooked into viewport updates
- Particle type: `ParticleAnimation` interface in `types.ts`

**✅ Slice 8: Project Lane Width**
- Project data model with `start`, `end`, `name`, `widthIncrement`
- Project lane rendering with variable width based on cumulative widthIncrements
- Generic `LanePathGenerator<T>` demonstrates successful generalization pattern

**✅ Slice 5: Auto-scroll System**
- RAF-based scroll loop with viewport position tracking
- Pause/resume mechanism for key events
- Callback system for updating animations during scroll

### What Needs to Be Added:

1. **Generic/Configurable Particle Controller:**
   - Make `ParticleAnimationController` work for both `Person` and `Project` entities
   - Accept entity type parameters (date accessor, name accessor, animation config)
   - Eliminate hardcoded people-specific logic

2. **Project Particle Configuration:**
   - Add `LAYOUT.particleAnimations.projects` config object
   - Green color, negative spawnOffsetY (above lane), project lane position

3. **Project Particle Integration:**
   - Instantiate controller for projects in `main.ts`
   - Hook into viewport update system (parallel to people particles)
   - Handle both people and project particles simultaneously

4. **Type System Updates:**
   - Generic `ParticleAnimation<T>` type or configuration-based approach
   - Ensure type safety for both entity types

---

## Detailed Task Breakdown

### Phase 1: Configuration & Planning
**Status:** Pending  
**🎯 INTEGRATION POINT:** Complete configuration before refactoring code

**Task 1.1: Study existing people particle implementation** (for implementer)
- Read `particle-animation-controller.ts` - understand spawn detection, SVG creation, animation loop
- Study constructor parameters - what's people-specific vs. what's generic
- Review `update()` method - how viewport position triggers spawn detection
- Identify hardcoded people-specific values (color, spawnOffsetY, date field, name field)
- **Rationale:** Understanding existing code is prerequisite for effective refactoring

**Task 1.2: Add project particle configuration to `config.ts`**
- Add to `LAYOUT.particleAnimations`:
  ```typescript
  projects: {
    spawnOffsetY: -60, // px - NEGATIVE = above lane (vs. people: 60 = below)
    detectionWindowSize: 50, // px - same as people
    fadeOutDuration: 300, // ms - same as people
    circleRadius: 8, // px - same as people
    circleColor: COLORS.projects, // Green (vs. people: blue)
    labelOffsetX: 15, // px - same as people
    labelFontSize: 11, // px - same as people
    labelFontFamily: 'sans-serif' as const,
    labelColor: COLORS.text, // Dark gray - same as people
  }
  ```
- **Note:** `spawnOffsetY` is negative (above) for projects vs. positive (below) for people
- **Rationale:** Centralizes configuration, makes values tunable, mirrors people structure

**Task 1.3: Map implementation patterns (mental model)**
- Document parallels between people and project particles:
  ```
  People Particles              → Project Particles
  ─────────────────────────────────────────────────────
  entity: Person                → entity: Project
  dateField: person.joined      → dateField: project.start
  nameField: person.name        → nameField: project.name
  color: blue (#4A90E2)         → color: green (#7ED321)
  direction: upward (Y+60→Y0)   → direction: downward (Y-60→Y0)
  laneCenterY: 650              → laneCenterY: 150
  config: LAYOUT...people       → config: LAYOUT...projects
  ```
- **Rationale:** Clear mapping guides refactoring decisions

---

### Phase 2: Refactor ParticleAnimationController to Generic
**Status:** Pending  
**🎯 INTEGRATION POINT:** Test with people particles after refactoring (no regressions)

**Task 2.1: Analyze refactoring strategy**
- **Option A:** Make class fully generic `ParticleAnimationController<T>`
  - Pros: Type-safe, mirrors `LanePathGenerator<T>` pattern from Slice 8
  - Cons: More refactoring, need to update `ParticleAnimation` interface
- **Option B:** Accept configuration object with accessor functions
  - Pros: Simpler, no type parameter needed
  - Cons: Less type-safe, configuration object can be verbose
- **Decision:** Use Option A (generic class) following Slice 8's successful pattern
- **Rationale:** Type safety + consistency with project architecture

**Task 2.2: Update `ParticleAnimation` interface in `types.ts`**
- Make interface generic or remove entity-specific fields:
  ```typescript
  export interface ParticleAnimation<T = unknown> {
    id: string; // Unique identifier (e.g., 'particle-{name}-join')
    entityName: string; // Generic name field (person.name or project.name)
    joinDate: Date; // Generic trigger date (person.joined or project.start)
    joinX: number;
    spawnX: number;
    laneBottomY: number; // For people (below), or laneTopY for projects (above)
    hasSpawned: boolean;
    isComplete: boolean;
    element?: d3.Selection<SVGGElement, unknown, null, undefined>;
    animationStartTime?: number;
    animationDuration?: number;
    startTransform?: { x: number; y: number };
  }
  ```
- OR: Rename `personName` → `entityName` and keep interface simple
- **Rationale:** Generic interface supports both entity types

**Task 2.3: Refactor ParticleAnimationController constructor**
- Change signature to accept generic parameters:
  ```typescript
  constructor<T>(
    svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
    xScale: d3.ScaleTime<number, number>,
    entities: T[], // Generic entity array
    getEntityDate: (entity: T) => Date, // Date accessor function
    getEntityName: (entity: T) => string, // Name accessor function
    getLaneWidthAt: (date: Date) => number,
    config: {
      laneCenterY: number,
      spawnOffsetY: number, // Positive = below, Negative = above
      circleRadius: number,
      circleColor: string,
      labelOffsetX: number,
      labelFontSize: number,
      labelFontFamily: string,
      labelColor: string,
      detectionWindowSize: number,
      fadeOutDuration: number,
    }
  ) { ... }
  ```
- **Rationale:** Configuration object encapsulates entity-specific behavior

**Task 2.4: Update `precomputeParticleMetadata()` method**
- Replace `person.joined` with `getEntityDate(entity)`
- Replace `person.name` with `getEntityName(entity)`
- Use `config.spawnOffsetY` instead of hardcoded `LAYOUT.particleAnimations.people.spawnOffsetY`
- Calculate spawn position considering sign of `spawnOffsetY`:
  ```typescript
  const laneEdgeY = config.laneCenterY + (config.spawnOffsetY > 0 ? laneWidth/2 : -laneWidth/2);
  ```
- **Rationale:** Generic logic works for both upward and downward animations

**Task 2.5: Update `spawnParticle()` method**
- Use `config.circleRadius`, `config.circleColor`, etc. from config object
- Remove hardcoded references to `LAYOUT.particleAnimations.people`
- Ensure transform calculation works for both positive and negative `spawnOffsetY`
- **Rationale:** SVG creation becomes configuration-driven

**Task 2.6: Update `update()` method spawn detection**
- Ensure spawn detection works regardless of animation direction
- Use `config.detectionWindowSize` from config object
- **Rationale:** Direction-agnostic spawn detection

**Task 2.7: Build and test with people particles (no regressions)**
- Update `main.ts` instantiation to pass configuration:
  ```typescript
  const peopleParticleController = new ParticleAnimationController(
    timeline.getSvg(),
    timeline.getXScale(),
    data.people,
    (person) => person.joined, // Date accessor
    (person) => person.name, // Name accessor
    (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
    {
      laneCenterY: LAYOUT.lanes.people.yPosition,
      ...LAYOUT.particleAnimations.people,
    }
  );
  ```
- Run dev server, verify people particles still work correctly
- **Expected:** Blue particles animate upward as before, no visual changes
- **Rationale:** Ensure refactoring doesn't break existing functionality

---

### Phase 3: Add Project Particle Controller
**Status:** Pending  
**🎯 INTEGRATION POINT:** See green particles animate downward during auto-scroll

**Task 3.1: Instantiate project particle controller in `main.ts`**
- Create project particle controller after people controller:
  ```typescript
  const projectParticleController = new ParticleAnimationController(
    timeline.getSvg(),
    timeline.getXScale(),
    data.projects,
    (project) => project.start, // Date accessor
    (project) => project.name, // Name accessor
    (date) => projectLanePathGenerator.getStrokeWidthAt(date),
    {
      laneCenterY: LAYOUT.lanes.projects.yPosition,
      ...LAYOUT.particleAnimations.projects,
    }
  );
  ```
- **Rationale:** Same pattern as people particles, different configuration

**Task 3.2: Wire project particle updates into viewport callback**
- Update `updateParticles` callback to call both controllers:
  ```typescript
  const updateParticles = (currentPositionX: number): void => {
    peopleParticleController.update(currentPositionX);
    projectParticleController.update(currentPositionX);
  };
  ```
- **Rationale:** Both particle systems update in sync with viewport

**Task 3.3: Update cleanup logic for both controllers**
- Modify `setupKeyboardControls` to cleanup both:
  ```typescript
  peopleParticleController.cleanup();
  projectParticleController.cleanup();
  ```
- **Rationale:** Reset both particle systems on timeline reset

**Task 3.4: Test integration - verify green particles spawn**
- Run dev server with `npm run dev`
- Start auto-scroll (Space or Right arrow)
- **Expected:** Green particles appear above project lane when timeline crosses project start dates
- Verify particle spawns at correct x-position (project.start date)
- Verify project name label visible next to circle
- Verify downward animation (from -60px above to lane center)
- Verify fade-out after reaching lane
- **Rationale:** End-to-end integration test

---

### Phase 4: Testing & Polish
**Status:** Pending

**Task 4.1: Test simultaneous people and project particles**
- Find timeline positions where person join and project start are close together
- Verify both blue (upward) and green (downward) particles animate simultaneously
- Ensure no visual interference between particle types
- **Rationale:** Systems should work independently without conflicts

**Task 4.2: Test edge cases**
- Multiple projects starting at same date
- Project starting very close to timeline start
- Project starting very close to timeline end
- Rapid auto-scroll through many project starts
- **Rationale:** Ensure robustness across scenarios

**Task 4.3: Verify animation timing and easing**
- Measure animation duration (should be ~0.5s from spawn to fade-out complete)
- Verify smooth easing (asymptotic ease-out)
- Verify fade-out duration (300ms)
- **Rationale:** Animation quality matches specification

**Task 4.4: Code quality review**
- Verify no TypeScript errors or `any` types
- Ensure no code duplication between people and project particle logic
- Verify configuration is cleanly separated from logic
- Check console for any warnings or errors
- **Rationale:** Clean, maintainable code

**Task 4.5: Visual polish**
- Verify green color matches project lane color
- Verify label text is readable during animation
- Verify particle doesn't overlap with lane path rendering
- Verify z-index ordering (particles should appear above lanes)
- **Rationale:** Professional visual quality

**Task 4.6: Performance check**
- Monitor frame rate during heavy particle activity (many simultaneous particles)
- Verify no memory leaks (particles are properly cleaned up)
- Check CPU usage during auto-scroll with particles
- **Rationale:** Ensure performance acceptable

---

## Success Criteria Checklist

### Core Functionality
- [ ] Green particles spawn when auto-scroll crosses project start dates
- [ ] Project name visible as text label next to particle
- [ ] Smooth 0.5s downward animation from 60px above to project lane center
- [ ] Particle circle and label animate together as a group
- [ ] Both circle and label fade out (opacity 1 → 0) after reaching lane
- [ ] Multiple project particles can animate simultaneously
- [ ] Particles spawn at correct x-position (project.start date)

### Code Reuse & Architecture
- [ ] `ParticleAnimationController` is generic/configurable for both entities
- [ ] No code duplication between people and project particle logic
- [ ] Configuration in `LAYOUT.particleAnimations.projects` parallel to people
- [ ] Entity-specific behavior passed as parameters (date accessor, name accessor, config)
- [ ] Integration in `main.ts` mirrors people particle pattern
- [ ] Same SVG creation, animation loop, cleanup logic used for both

### Technical Quality
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during rendering or animation
- [ ] Generic type parameters used correctly (if generic approach chosen)
- [ ] Particle cleanup prevents memory leaks
- [ ] Frame rate remains smooth during heavy particle activity

### Visual Quality
- [ ] Green color matches project lane color (#7ED321)
- [ ] Label text is readable during animation
- [ ] Downward motion is smooth and organic (asymptotic easing)
- [ ] Fade-out timing feels natural (300ms)
- [ ] Particles appear above lanes (correct z-index)
- [ ] No visual interference between people and project particles

### Integration
- [ ] Works during auto-scroll (Space/Right arrow)
- [ ] Both people (upward) and project (downward) particles work simultaneously
- [ ] Particles reset correctly when timeline resets (Left arrow)
- [ ] Doesn't interfere with lane rendering, counters, photos, or event markers
- [ ] Spawn detection works at all scroll speeds

---

## Technical Decisions

### Decision #1: Generic ParticleAnimationController vs. Separate Classes
**Decision:** Make `ParticleAnimationController` generic/configurable  
**Rationale:**
- Follows Slice 8's successful `LanePathGenerator<T>` pattern
- Eliminates ~400 lines of duplicated code
- Entity-specific behavior (date field, name field, animation direction) cleanly parameterized
- Single animation loop, spawn detection, and cleanup logic shared
- Easier to add more entity types in future (e.g., milestone particles)

**Alternative considered:** Duplicate `ParticleAnimationController` as `ProjectParticleAnimationController`
- **Rejected:** Violates DRY principle, harder to maintain, learned lesson from Slice 8

### Decision #2: spawnOffsetY Sign Convention
**Decision:** Use positive for below, negative for above  
**Rationale:**
- Intuitive: Y-axis increases downward in SVG
- Positive offset = particle below lane (people)
- Negative offset = particle above lane (projects)
- Single calculation works for both directions:
  ```typescript
  const laneEdgeY = laneCenterY + (spawnOffsetY > 0 ? +laneWidth/2 : -laneWidth/2);
  ```

### Decision #3: Animation Duration Source
**Decision:** Keep animation duration hardcoded at 500ms (0.5s per spec), not in config  
**Rationale:**
- Spec explicitly states "0.5s ease-out" for all particle animations
- No need for configurability - all particles use same timing
- Fade-out duration (300ms) can be configurable as it may vary

### Decision #4: Particle ID Generation
**Decision:** Use pattern `particle-{entityName}-{type}` (e.g., `particle-Platform v1-join`)  
**Rationale:**
- Entity names are unique within their type (no duplicate person/project names)
- Simple string concatenation, no UUID needed
- Human-readable for debugging

### Decision #5: Z-index and SVG Ordering
**Decision:** Particle group appended after lanes, ensuring particles render above lanes  
**Rationale:**
- SVG rendering order = z-index (later elements appear on top)
- Particles need to appear above lanes for visibility
- Already established pattern from people particles (Slice 6)

### Decision #6: Configuration Object Structure
**Decision:** Spread `LAYOUT.particleAnimations.{type}` into config parameter  
**Rationale:**
- Clean instantiation syntax: `{ laneCenterY: ..., ...LAYOUT.particleAnimations.projects }`
- All animation parameters centralized in `config.ts`
- Easy to override specific values if needed

### Decision #7: RAF-based Animation vs. D3 Transitions
**Decision:** Keep RAF-based animation (established in Slice 6)  
**Rationale:**
- Already implemented and working well
- Allows pause/resume during auto-scroll pauses
- More control over asymptotic easing
- Consistent with existing people particle implementation

---

## Estimated Complexity

### Phase 1: Configuration & Planning
**Time:** 0.5-1 hour  
**Complexity:** Low  
- Mostly reading and documenting existing code
- Configuration addition is straightforward

### Phase 2: Refactor to Generic
**Time:** 2-3 hours  
**Complexity:** Medium-High  
- Type system changes require careful consideration
- Constructor signature changes impact existing instantiation
- Need to ensure no regressions in people particles
- Multiple methods need updating (precompute, spawn, update)

### Phase 3: Add Project Particles
**Time:** 0.5-1 hour  
**Complexity:** Low  
- After generic refactor, instantiation is simple
- Wiring into callbacks is straightforward
- Most work done in Phase 2

### Phase 4: Testing & Polish
**Time:** 1-2 hours  
**Complexity:** Medium  
- Visual testing requires running app and observing behavior
- Edge case testing may reveal issues needing fixes
- Performance testing requires monitoring tools

**Total Estimated Time:** 4-7 hours  
**Risk Level:** Medium (refactoring existing code, type system changes)

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-002:** Particle Join Animations
  - "When project starts: green circle (8px radius) animates from above into project lane"
  - "Start position: 60px above lane"
  - "Duration: 0.5s ease-out"
  - "Text label with project's name positioned 15px to the right of circle"
  - "Circle and label move together"
  - "Both dissolve (opacity 1 → 0) after reaching lane"

### User Stories:
- **US-003:** Growth Visualization with Join Animations
  - "When project starts: green particle (8px circle) animates from above into project lane over 0.5s"
  - "Particle displays project's name as text label during animation"
  - "Particle and label disappear after merging into lane"

### Data Model:
- **Section 3.1:** Input JSON Schema
  - Projects array with `start` dates (triggers particle spawn)
  - Project has `name` field (displayed on particle label)
  - Project has `widthIncrement` field (lane width change, not used by particles)

### UI Specifications:
- **Section 4.2:** Color Palette
  - Project Lane color: `#7ED321` (Green) - matches particle circle color

- **Section 4.4:** Animation Timings
  - Particle join: 0.5s ease-out (all entities)

### Prompt Slice 9:
- "Green circle (8px radius) starting 60px above project lane"
- "Text label with project.name positioned 15px to right of circle"
- "Animate downward to project lane over 0.5s (ease-out)"
- "Circle and label move together as a group"
- "On animation completion: Fade out both circle and label (opacity 1 → 0)"
- "Multiple particles can animate simultaneously if project starts are close together"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slice 6 complete (people particle animations)
- ✅ Slice 8 complete (project lane width, generic pattern example)
- ✅ Auto-scroll system with RAF loop
- ✅ ViewportController tracking current viewport position
- ✅ Project data with start dates and names
- ✅ xScale for date-to-position conversion

**Files to modify:**
- `src/particle-animation-controller.ts` - refactor to generic
- `src/types.ts` - update `ParticleAnimation` interface
- `src/config.ts` - add project particle configuration
- `src/main.ts` - instantiate project particle controller

**Files to reference:**
- `docs/prompt-slice-6.md` - original people particle prompt
- `docs/workplan-slice-6.md` - people particle implementation plan
- `src/lane-path-generator.ts` - example of generic pattern from Slice 8

---

## Open Questions

1. **Should ParticleAnimation interface be fully generic `<T>` or just rename fields?**
   - **Leaning toward:** Rename `personName` → `entityName`, keep interface simple
   - **Rationale:** Less complex, sufficient for current needs

2. **How to handle z-index if we add more particle types later?**
   - **Answer:** Current append-order approach works, re-evaluate if conflicts arise

3. **Should we add animation direction to config (up/down) or derive from spawnOffsetY sign?**
   - **Leaning toward:** Derive from sign (positive = up, negative = down)
   - **Rationale:** One less config parameter, direction is implicit in offset

4. **Should animation duration be configurable per entity type?**
   - **Answer:** No, spec says 0.5s for all particles, keep it constant

5. **How to name controller instances in main.ts?**
   - **Leaning toward:** `peopleParticleController` and `projectParticleController`
   - **Rationale:** Clear, descriptive, parallel naming

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-10-29  
**Next Step:** Begin Phase 1 - study existing particle code and add configuration

