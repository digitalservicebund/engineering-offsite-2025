You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 5 - Auto-Scroll with Key Event Pausing

**Goal:** Continuous auto-scroll at fixed speed that automatically pauses at key events.

**What to build:**
1. Implement auto-scroll system:
   - Use requestAnimationFrame for smooth 60fps animation
   - Scroll at constant speed: 200 pixels/second
   - Update translateX position each frame based on elapsed time
2. Detect key events in scroll path:
   - Pre-calculate x-positions of all events where isKeyMoment=true
   - Monitor current scroll position
   - Pause when reaching within ~5px of key event position
3. Implement state machine:
   - States: idle, scrolling, paused
   - Space/Right arrow: start scrolling OR resume from pause
   - Left arrow: scroll backward at 200px/sec
   - Space while scrolling: toggle pause
4. Add visual indicator when paused at key event (e.g., subtle pulse on event marker)

**Expected output:**
Press Space → timeline auto-scrolls smoothly at steady pace → automatically pauses when reaching a key event → press Space again → resumes scrolling.

**Success criteria:**
- Auto-scroll moves at constant 200px/second (not faster/slower between events)
- Pauses automatically at each isKeyMoment=true event
- Visual feedback when paused (pulsing marker or indicator)
- Space bar resumes from pause
- Left arrow reverses direction at same speed
- All Slice 3-4 features continue working (counters, width growth)

**Reference sections in spec:**
- Section 3.1 (Data Model - events with isKeyMoment property)
- Section 4.4 (Animation Timings - auto-scroll: 200px/sec linear)
- Section 5.2 (Standard Auto-Scroll Flow - detailed logic)
- Section 5.3 (Pause/Resume Flow)
- Section 5.4 (Reverse Scroll Flow)
- FR-004 (Camera/Viewport Control)
- US-001 (Acceptance criteria for auto-scroll)

Use high-resolution timestamps (performance.now()) for precise speed control. This builds on Slices 1-4.