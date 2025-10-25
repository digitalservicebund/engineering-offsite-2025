You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 9 - Particle Join Animations (Projects)

**Goal:** Animated particles with name labels appear when project starts during auto-scroll.

**What to build:**
1. Detect when auto-scroll crosses a project start date:
   - Track last processed x-position
   - Check if any project.start dates fall between last and current position
2. Spawn particle animation for each project start:
   - Green circle (8px radius) starting 60px above project lane
   - Text label with project.name positioned 15px to right of circle
   - Animate downward to project lane over 0.5s (ease-out)
   - Circle and label move together as a group
3. On animation completion:
   - Fade out both circle and label (opacity 1 → 0)
   - Trigger project lane width increment by project.widthIncrement
4. Use D3 transitions or CSS animations for smooth motion

**Expected output:**
During auto-scroll, when timeline reaches a project start date, a green circle with the project name animates downward from above the project lane, then disappears as it merges. The lane grows thicker by widthIncrement.

**Success criteria:**
- Green particle appears at correct x-position when project start date reached
- Project name visible next to particle during animation
- Smooth 0.5s downward motion from 60px above to lane position
- Particle and label both fade out after reaching lane
- Project lane width increases by project.widthIncrement after particle merges
- Multiple particles can animate simultaneously if project starts are close together

**Reference sections in spec:**
- Section 3.1 (Data Model - projects array with start date, name, widthIncrement)
- Section 4.4 (Animation Timings - particle join: 0.5s ease-out)
- FR-002 (Particle Join Animations - projects specification)
- US-003 (Acceptance criteria including particle animations)

Tip: Reuse particle animation system from Slice 6 (people particles), but reverse direction (downward instead of upward) and use green color. Trigger width increment by project.widthIncrement instead of 1px. This is parallel to Slice 6's implementation.