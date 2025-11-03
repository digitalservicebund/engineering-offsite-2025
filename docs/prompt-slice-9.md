You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 9 - Particle Join Animations (Projects)

**Goal:** Animated particles with name labels appear when project starts during auto-scroll.

**IMPORTANT:** This slice is architecturally parallel to Slice 6 (People Particle Animations). **Generalize and reuse the existing people particle animation code as much as possible.** The logic is identical except for:
- People particles: Blue, animate upward from below people lane, triggered by `person.joined`
- Project particles: Green, animate downward from above project lane, triggered by `project.start`

**Implementation approach:**
1. **Examine the people particle implementation:**
   - Look at `ParticleAnimationController` class structure
   - Study the spawn detection logic (detecting when scroll crosses dates)
   - Review the particle SVG creation (circle + text label as group)
   - Understand the animation mechanism (RAF-based position interpolation)
   - Note the fade-out and cleanup logic

2. **Generalize the existing pattern:**
   - Make `ParticleAnimationController` generic or configurable for different entity types
   - Extract entity-agnostic animation logic (spawn detection, SVG creation, movement, fade-out)
   - Take entity-specific behavior as parameters:
     * Entity type (Person vs Project)
     * Date field accessor (`person.joined` vs `project.start`)
     * Name field accessor (`person.name` vs `project.name`)
     * Animation direction (upward vs downward)
     * Color (blue vs green)
     * Lane position
     * Configuration object (from `LAYOUT.particleAnimations.people` or `.projects`)
   - Avoid duplication: Use same spawn detection, SVG structure, animation loop, cleanup logic

3. **Specific parallel mappings:**
   - `person.joined` → `project.start` (trigger date)
   - `person.name` → `project.name` (label text)
   - Blue color (`#4A90E2`) → Green color (`#66BB6A` from LAYOUT)
   - Upward motion (`spawnOffsetY: 60`) → Downward motion (`spawnOffsetY: -60`)
   - People lane center Y → Project lane center Y
   - Lane width increment: +1px → +`project.widthIncrement`px
   - Same: circle radius (8px), label offset (15px), animation duration (0.5s), fade-out timing

**What to build:**
1. **Refactor `ParticleAnimationController` to be generic/configurable:**
   - Accept entity array (Person[] or Project[])
   - Accept configuration object defining:
     * Circle color
     * Spawn offset Y (positive for below, negative for above)
     * Lane center Y position
     * Entity date accessor function
     * Entity name accessor function
   - OR: Create generic base class/shared functions and thin wrappers for people/projects
   - **Key lesson from Slice 8:** Prefer direct generic usage with configuration over duplication

2. **Add project particle configuration to `config.ts`:**
   ```typescript
   particleAnimations: {
     people: { /* existing config */ },
     projects: {
       circleRadius: 8,
       circleColor: COLORS.projects, // Green
       spawnOffsetY: -60, // Negative = above lane
       labelOffsetX: 15,
       labelFontSize: '14px',
       labelFontFamily: 'sans-serif',
       labelColor: COLORS.projects,
       animationDuration: 500, // ms
       fadeOutDuration: 300 // ms
     }
   }
   ```

3. **Spawn project particles during auto-scroll:**
   - Detect when viewport crosses `project.start` dates (reuse people detection logic)
   - Create SVG group with green circle + project name label
   - Animate downward from 60px above project lane to lane center (mirror people upward motion)
   - Use same RAF-based animation loop as people particles

4. **Integrate with project lane width:**
   - After particle fade-out completes, width already updated by static lane path
   - No action needed (lane path is pre-rendered based on all project dates)

**Expected output:**
During auto-scroll, when timeline reaches a project start date, a green circle with the project name animates downward from above the project lane, then disappears as it merges. The lane thickness reflects the cumulative widthIncrements.

**Success criteria:**
- Green particle appears at correct x-position when project start date reached
- Project name visible next to particle during animation
- Smooth 0.5s downward motion from 60px above to lane position
- Particle and label both fade out after reaching lane
- Multiple particles can animate simultaneously if project starts are close together
- **Code architecture reuses people particle implementation (generic or configured)**
- **No duplication of spawn detection, SVG creation, animation, or cleanup logic**

**Reference sections in spec:**
- Section 3.1 (Data Model - projects array with start date, name, widthIncrement)
- Section 4.4 (Animation Timings - particle join: 0.5s ease-out)
- FR-002 (Particle Join Animations - projects specification)
- US-003 (Acceptance criteria including particle animations)

**Key principle:** Don't copy-paste. The people particle system already solves this problem—make it generic or configurable for projects. Apply lessons from Slice 8's generic `LanePathGenerator` approach.