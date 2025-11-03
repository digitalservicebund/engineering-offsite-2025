You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 10 - Departure Animations (People Leaving & Projects Ending)

**Goal:** Animated particles appear when people leave or projects end during auto-scroll, providing visual feedback for departures.

**IMPORTANT:** This slice is architecturally parallel to Slices 6 & 9 (Join/Start Particle Animations). **Extend the existing generic `ParticleAnimationController<T>` to support departure events.** The logic is nearly identical except for:
- Join/Start particles: Animate toward lane (downward for projects, upward for people)
- Leave/End particles: Animate away from lane (upward for both)
- Leave/End particles: Slower fade-out (600ms vs 300ms) for more contemplative feel
- Leave/End particles: Subdued colors (computed from main colors, ~70% lightness)

**Implementation approach:**

1. **Examine the existing particle implementation:**
   - Look at `ParticleAnimationController<T>` - already generic for Person and Project
   - Study how join/start particles spawn and animate
   - Review the configuration pattern in `LAYOUT.particleAnimations.{people,projects}`
   - Understand the spawn detection logic (detecting when scroll crosses dates)

2. **Extend the existing pattern:**
   - Add departure particle configurations for people and projects
   - Support two event types per entity: "join/start" and "leave/end"
   - Same spawn detection, SVG creation, animation loop - different direction and timing
   - Compute subdued colors programmatically (don't add separate color configs)
   - Use longer fade-out for departures (600ms vs 300ms)

3. **Specific parallel mappings:**
   ```
   Join/Start Particles          → Leave/End Particles
   ─────────────────────────────────────────────────────
   Trigger: person.joined        → Trigger: person.left
   Trigger: project.start        → Trigger: project.end
   Direction: toward lane        → Direction: away from lane (upward for both)
   People: upward to lane        → People: upward from lane
   Projects: downward to lane    → Projects: upward from lane
   Fade-out: 300ms               → Fade-out: 600ms (slower, more contemplative)
   Color: full saturation        → Color: subdued (computed, ~70% lightness)
   ```

4. **Color approach (simplest solution):**
   - Use same colors as join/start particles
   - Apply subdued appearance via SVG `fill-opacity` attribute
   - Define single constant: `SUBDUED_OPACITY = 0.6`
   - Much simpler than HSL conversion - leverages CSS/SVG capabilities

**What to build:**

1. **Extend configuration to support departure events:**
   - Add to `LAYOUT.particleAnimations.people`:
     ```typescript
     leaving: {
       spawnOffsetY: -60, // Same as joining: 60px below lane, but will animate upward
       fadeOutDuration: 600, // ms - slower than joins (was 300ms)
       // Reuse: circleRadius, labelOffsetX, labelFontSize, labelFontFamily, detectionWindowSize
       // Reuse colors: circleColor, labelColor (apply SUBDUED_OPACITY in SVG)
     }
     ```
   - Add to `LAYOUT.particleAnimations.projects`:
     ```typescript
     ending: {
       spawnOffsetY: 60, // 60px above lane (was -60 for starting), will animate upward
       fadeOutDuration: 600, // ms - slower than starts (was 300ms)
       // Reuse: circleRadius, labelOffsetX, labelFontSize, labelFontFamily, detectionWindowSize
       // Reuse colors: circleColor, labelColor (apply SUBDUED_OPACITY in SVG)
     }
     ```
   
2. **Create separate controller instances for departures**
   - Instantiate 4 controllers: peopleJoining, peopleLeaving, projectsStarting, projectsEnding
   - Each with appropriate date accessor (person.joined, person.left, project.start, project.end)

3. **Instantiate departure controllers in `main.ts`:**
   ```typescript
   const peopleLeaving = new ParticleAnimationController<Person>(
     timeline.getSvg(),
     timeline.getXScale(),
     data.people.filter(p => p.left !== null), // Only people who left
     (person) => person.left!,
     (person) => person.name,
     (date) => peopleLanePathGenerator.getStrokeWidthAt(date),
     {
       laneCenterY: LAYOUT.lanes.people.yPosition,
       ...LAYOUT.particleAnimations.people, // Reuse base config
       spawnOffsetY: -60, // Override: Below lane (will animate upward, away from lane)
       fadeOutDuration: 600, // Override: Slower fade
     }
   );

   const projectsEnding = new ParticleAnimationController<Project>(
     timeline.getSvg(),
     timeline.getXScale(),
     data.projects.filter(p => p.end !== null), // Only projects that ended
     (project) => project.end!,
     (project) => project.name,
     (date) => projectLanePathGenerator.getStrokeWidthAt(date),
     {
       laneCenterY: LAYOUT.lanes.projects.yPosition,
       ...LAYOUT.particleAnimations.projects, // Reuse base config
       spawnOffsetY: 60, // Override: Above lane (will animate upward, away from lane)
       fadeOutDuration: 600, // Override: Slower fade
     }
   );
   
   // Apply SUBDUED_OPACITY in ParticleAnimationController when rendering
   // (modify spawnParticle() to check if using subdued appearance)
   ```

4. **Wire into viewport updates and cleanup:**
   - Add to `updateParticles` callback
   - Add to cleanup on Left Arrow (reset)
   - Update `setupKeyboardControls` signature to accept 4 controllers

**Expected output:**
During auto-scroll:
- When timeline reaches `person.left` date: Light blue particle animates upward from below people lane
- When timeline reaches `project.end` date: Light green particle animates upward from above project lane
- Both types fade out slowly (600ms) for contemplative feel
- Particles show entity name during animation
- Lane widths reflect departures (people count decreases, project width decreases)

**Success criteria:**
- Departure particles spawn when auto-scroll crosses leave/end dates
- Entity name visible as text label next to particle
- Smooth upward animation away from lane over 0.5s
- Particle circle and label animate together as a group
- Both circle and label fade out (opacity 1 → 0) over 600ms (slower than joins/starts)
- Subdued appearance via opacity (lighter blue for people, lighter green for projects)
- Multiple departure particles can animate simultaneously
- Works for both people leaving and projects ending
- **Code reuses existing `ParticleAnimationController<T>` - no new animation logic needed**

**Reference sections in spec:**
- Section 3.1 (Data Model - people.left and project.end dates)
- Section 4.4 (Animation Timings - adapt for departure particles)
- FR-006 (Departure Indicators - now using particles instead of curves)
- Slice 6 (People Join Particles - original particle implementation)
- Slice 9 (Project Start Particles - generic particle controller)

**Key principle:** Don't reinvent the wheel. The generic particle system already solves this problem—instantiate additional controllers for departure events with different configuration (direction, color, timing). Apply lessons from Slices 8 & 9: prefer direct generic usage with configuration over creating new abstractions.

**Design note:** Using particles for departures (instead of curves) simplifies the codebase, provides consistent visual language, and allows complete reuse of existing, battle-tested animation code.
