You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 6 - Particle Join Animations (People Only)

**Goal:** Animated particles with name labels appear when person joins during auto-scroll.

**What to build:**
1. Detect when auto-scroll crosses a person join date:
   - Track last processed x-position
   - Check if any person.joined dates fall between last and current position
2. Spawn particle animation for each join:
   - Blue circle (8px radius) starting 60px below people lane
   - Text label with person.name positioned 15px to right of circle
   - Animate upward to people lane over 0.5s (ease-out)
   - Circle and label move together as a group
3. On animation completion:
   - Fade out both circle and label (opacity 1 → 0)
   - Trigger people lane width increment by 1px
4. Use D3 transitions or CSS animations for smooth motion

**Expected output:**
During auto-scroll, when timeline reaches a person join date, a blue circle with their name animates upward from below the people lane, then disappears as it merges. The lane grows 1px thicker.

**Success criteria:**
- Blue particle appears at correct x-position when join date reached
- Person's name visible next to particle during animation
- Smooth 0.5s upward motion from 60px below to lane position
- Particle and label both fade out after reaching lane
- People lane width increases by 1px after particle merges
- Multiple particles can animate simultaneously if joins are close together

**Reference sections in spec:**
- Section 3.1 (Data Model - people array with joined dates)
- Section 4.4 (Animation Timings - particle join: 0.5s ease-out)
- FR-002 (Particle Join Animations - people specification)
- US-003 (Acceptance criteria including particle animations)

Tip: Create SVG group element containing circle + text, animate the group's transform. This builds on Slice 5's auto-scroll system.