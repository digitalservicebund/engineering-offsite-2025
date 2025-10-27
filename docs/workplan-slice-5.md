# Slice 5 Implementation Plan: Auto-Scroll with Key Event Pausing

**Status:** Ready for Implementation  
**Created:** 2025-10-26

---

## Context Analysis

✅ **Already in place from Slices 1-4:**
- Timeline SVG with three lanes (projects, events, people)
- ViewportController with `panLeft()` and `panRight()` methods
- CSS transition-based smooth panning (600ms ease-out)
- Keyboard controls in `main.ts` (Space/Right/Left arrows)
- Counter updates via `onViewportChange` callback
- Continuous counter updates during transitions using `requestAnimationFrame` in ViewportController
- Event data with `isKeyMoment` boolean property (4 key events in current data)
- D3 time scale (`xScale`) for date-to-position mapping
- People lane with dynamic width rendering

❌ **Not yet implemented (needed for Slice 5):**
- Auto-scroll mechanism using `requestAnimationFrame` for continuous scrolling
- Pre-computed x-positions of key events (for pause detection)
- State machine (idle/scrolling/paused states)
- Pause detection when reaching key events
- Visual indicator when paused at key event
- Modified keyboard controls that respond to current state
- Speed-controlled scrolling at 200px/second (not distance-based like current manual panning)

🔄 **Major architectural changes needed:**
- Replace CSS transition-based panning with `requestAnimationFrame`-based animation
- Change from "pan by fixed distance" to "scroll at fixed speed"
- Add state tracking and key event position monitoring
- Modify ViewportController to support both manual and auto-scroll modes

---

## Detailed Task Breakdown

### Phase 1: Configuration & Key Event Detection Setup
**Status:** ✅ Complete

**Task 1.1: Add auto-scroll configuration to `config.ts`** ✅ DONE
- Add auto-scroll settings:
  ```typescript
  autoScroll: {
    speed: 200, // px/sec - constant scroll speed per spec
    keyEventPauseThreshold: 5, // px - how close to key event before pausing
    pausedIndicatorPulseDuration: 2000, // ms - duration of pulse animation
  }
  ```
- **Rationale:** Centralizes scroll speed and pause detection threshold for easy tuning.

**Task 1.2: Add types for scroll state machine** ✅ DONE
- Add to `types.ts`:
  ```typescript
  export type ScrollState = 'idle' | 'scrolling' | 'paused';
  export type ScrollDirection = 'forward' | 'backward';
  
  export interface KeyEventPosition {
    eventId: string;
    eventName: string;
    xPosition: number;
  }
  ```
- **Rationale:** Type safety for state machine and key event tracking.

**Task 1.3: Pre-calculate key event x-positions** ✅ DONE
- Add method to Timeline class: `getKeyEventPositions(): KeyEventPosition[]`
- Filter events where `isKeyMoment === true`
- Map each to x-position using `xScale(event.date)`
- Sort by x-position (ascending)
- Return array of `{ eventId, eventName, xPosition }`
- **Rationale:** Pre-calculation avoids repeated filtering/mapping during scroll loop.

---

### Phase 2: Auto-Scroll Engine in ViewportController
**Status:** In Progress

**Task 2.1: Add state machine properties to ViewportController** ✅ DONE
- New private properties:
  ```typescript
  private scrollState: ScrollState = 'idle';
  private scrollDirection: ScrollDirection = 'forward';
  private keyEventPositions: KeyEventPosition[] = [];
  private lastFrameTimestamp: number | null = null;
  private autoScrollFrameId: number | null = null;
  private pausedAtEventId: string | null = null;
  ```
- **Rationale:** Track current state, direction, and animation frame for scroll loop.

**Task 2.2: Create `startAutoScroll(direction: ScrollDirection)` method** ✅ DONE
- Set `scrollState = 'scrolling'`
- Set `scrollDirection = direction`
- Reset `lastFrameTimestamp = null` (will be set on first frame)
- Cancel any existing animation frame
- Call `autoScrollLoop()` with `requestAnimationFrame`
- **Rationale:** Entry point for starting continuous scroll.

**Task 2.3: Implement core auto-scroll loop using `requestAnimationFrame`** ✅ DONE
- Create `private autoScrollLoop(timestamp: number): void`
- Algorithm:
  ```typescript
  1. If scrollState !== 'scrolling', exit (stop loop)
  2. Calculate elapsed time since last frame:
     - If lastFrameTimestamp === null: elapsed = 0 (first frame)
     - Else: elapsed = timestamp - lastFrameTimestamp
  3. Calculate distance to move: distance = (LAYOUT.autoScroll.speed / 1000) * elapsed
  4. Apply movement based on direction:
     - Forward: increase currentOffset by distance
     - Backward: decrease currentOffset by distance
  5. Clamp to boundaries [minOffset, maxOffset]
  6. Apply transform (without CSS transition - instant update)
  7. Check if reached key event → pause if within threshold
  8. Update counters via onViewportChange callback
  9. Store timestamp for next frame
  10. Schedule next frame with requestAnimationFrame
  ```
- Use high-resolution timestamp from `requestAnimationFrame` (DOMHighResTimeStamp)
- **Rationale:** Precise speed control independent of frame rate. At 60fps, each frame moves ~3.33px (200px/sec ÷ 60).

**Task 2.4: Implement key event pause detection** ✅ DONE
- Create `private checkForKeyEventPause(): boolean`
- Get current position marker x: `currentPositionX = currentOffset + viewportWidth * currentPositionRatio`
- Find next key event in scroll direction:
  - Forward: first key event where `xPosition > currentPositionX`
  - Backward: last key event where `xPosition < currentPositionX`
- Check if within threshold: `Math.abs(currentPositionX - keyEventX) <= threshold`
- If yes:
  - Set `scrollState = 'paused'`
  - Store `pausedAtEventId = eventId`
  - Snap to exact key event position (optional, for precision)
  - Trigger visual pause indicator
  - Return true (pause triggered)
- If no, return false (continue scrolling)
- **Rationale:** Monitors scroll position and pauses at key narrative moments.

**Task 2.5: Create `stopAutoScroll()` method** ✅ DONE
- Cancel animation frame if active
- Set `scrollState = 'idle'`
- Reset `lastFrameTimestamp = null`
- Clear `pausedAtEventId = null`
- **Rationale:** Clean shutdown of auto-scroll system.

**Task 2.6: Create `resumeAutoScroll()` method** ✅ DONE
- If `scrollState === 'paused'`:
  - Set `scrollState = 'scrolling'`
  - Reset `lastFrameTimestamp = null` (restart timing)
  - Restart `autoScrollLoop()`
- **Rationale:** Resume from paused state at key event.

**Task 2.7: Create `togglePause()` method** ✅ DONE
- If `scrollState === 'scrolling'`:
  - Set `scrollState = 'paused'`
  - Cancel animation frame
- Else if `scrollState === 'paused'`:
  - Call `resumeAutoScroll()`
- **Rationale:** Space bar toggle functionality while scrolling.

**Task 2.8: Modify `applyTransform()` to support instant updates** ✅ DONE (completed in Task 2.3)
- Add parameter: `useTransition: boolean = true`
- If `useTransition === false`:
  - Apply transform without setting `isAnimating` flag
  - Don't use CSS transition (set `transition: none` temporarily)
- If `useTransition === true`:
  - Keep existing CSS transition behavior (for manual panning)
- **Rationale:** Auto-scroll needs instant updates every frame, not CSS transitions.

**Task 2.9: Add public getters for state** ✅ DONE
- `getScrollState(): ScrollState`
- `getScrollDirection(): ScrollDirection`
- `getPausedEventId(): string | null`
- **Rationale:** Allow external components to react to scroll state changes.

---

### Phase 3: Visual Pause Indicator
**Status:** ✅ Complete

**Task 3.1: Add pause indicator styling to `style.css`** ✅ DONE
- Create `.event-marker.paused` class:
  ```css
  .event-marker.paused .marker-line {
    stroke: #E74C3C; /* Red highlight */
    stroke-width: 5px; /* Thicker */
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  ```
- **Visual encoding:** Pulsing red marker indicates paused state at key event
- **Rationale:** Clear visual feedback that auto-scroll has paused.

**Task 3.2: Add method to Timeline class: `highlightEvent(eventId: string | null)`** ✅ DONE
- Select event marker by ID: `this.svg.select(\`.event-marker[data-id="${eventId}"]\`)`
- Add `paused` class to trigger CSS animation
- If `eventId === null`, remove `paused` class from all markers (clear highlight)
- **Rationale:** Timeline class owns SVG rendering, including visual indicators.

**Task 3.3: Ensure event markers have data-id attributes** ✅ DONE
- Modify `renderEventMarkers()` in Timeline class
- Add `.attr('data-id', d => d.id)` to event marker groups
- **Rationale:** Enable selection of specific marker by event ID.

---

### Phase 4: Keyboard Control State Machine
**Status:** Pending

**Task 4.1: Refactor `setupKeyboardControls()` in `main.ts`**
- Current behavior is simple manual panning
- New behavior depends on current scroll state:

**Task 4.2: Implement Space bar state-aware logic**
- Space bar behavior:
  ```typescript
  If scrollState === 'idle':
    → Start auto-scroll forward
  Else if scrollState === 'scrolling':
    → Toggle pause (manual pause, not at key event)
  Else if scrollState === 'paused':
    → Resume auto-scroll in current direction
  ```
- Call `viewportController.startAutoScroll('forward')`, `togglePause()`, or `resumeAutoScroll()`

**Task 4.3: Implement Right arrow state-aware logic**
- Right arrow behavior:
  ```typescript
  If scrollState === 'idle':
    → Start auto-scroll forward
  Else if scrollState === 'paused':
    → Resume auto-scroll forward
  Else if scrollState === 'scrolling' with direction backward:
    → Reverse to forward direction (stop and restart)
  Else:
    → No-op (already scrolling forward)
  ```
- **Rationale:** Right arrow always means "go forward" or "resume forward"

**Task 4.4: Implement Left arrow state-aware logic**
- Left arrow behavior:
  ```typescript
  If scrollState === 'idle':
    → Start auto-scroll backward
  Else if scrollState === 'paused':
    → Resume auto-scroll backward
  Else if scrollState === 'scrolling' with direction forward:
    → Reverse to backward direction (stop and restart)
  Else:
    → No-op (already scrolling backward)
  ```
- **Rationale:** Left arrow always means "go backward" or "resume backward"

**Task 4.5: Wire up visual pause indicator**
- In keyboard control logic, after state changes:
  - If entering paused state: `timeline.highlightEvent(viewportController.getPausedEventId())`
  - If leaving paused state: `timeline.highlightEvent(null)` (clear highlight)
- **Rationale:** Sync visual feedback with state machine.

---

### Phase 5: Integration & Cleanup
**Status:** Pending

**Task 5.1: Update ViewportController constructor**
- Accept `keyEventPositions: KeyEventPosition[]` parameter
- Store in instance property
- **Rationale:** ViewportController needs key event positions for pause detection.

**Task 5.2: Update ViewportController instantiation in `main.ts`**
- After timeline render, get key event positions:
  ```typescript
  const keyEventPositions = timeline.getKeyEventPositions();
  ```
- Pass to ViewportController constructor
- **Rationale:** Ensure ViewportController has data needed for auto-scroll.

**Task 5.3: Handle boundary conditions**
- When scrolling reaches timeline end (currentOffset >= maxOffset):
  - Stop auto-scroll
  - Set state to 'idle'
  - Log completion message
- When scrolling reaches timeline start (currentOffset <= minOffset):
  - Stop auto-scroll
  - Set state to 'idle'
- **Rationale:** Prevent scrolling beyond timeline boundaries.

**Task 5.4: Remove or deprecate manual panning methods**
- **Decision:** Keep `panLeft()` and `panRight()` for now (no harm, might be useful)
- But ensure keyboard controls don't call them anymore (replaced by auto-scroll)
- Add deprecation comment if keeping
- **Rationale:** Clean API surface, avoid confusion between manual and auto-scroll.

---

### Phase 6: Testing & Validation
**Status:** Pending

**Task 6.1: Test basic auto-scroll**
- Start from beginning of timeline
- Press Space bar
- ✓ Timeline should start scrolling at steady pace
- ✓ Counters should update continuously
- ✓ Speed should feel constant (not accelerating/decelerating)

**Task 6.2: Test key event auto-pause**
- Press Space to start scrolling
- ✓ Should automatically pause at first key event (evt2: "First Product Launch")
- ✓ Pause indicator should appear (pulsing red marker)
- ✓ Scroll should stop smoothly, not overshoot
- Press Space again
- ✓ Should resume scrolling
- ✓ Should pause at next key event (evt3: "First Team Offsite")

**Task 6.3: Test manual pause/resume (Space bar toggle)**
- Press Space to start scrolling
- Press Space again before reaching key event
- ✓ Should pause immediately (manual pause, not at key event)
- ✓ No pause indicator (since not at key event)
- Press Space again
- ✓ Should resume scrolling

**Task 6.4: Test reverse scrolling**
- Press Space to scroll forward to middle of timeline
- Press Left arrow
- ✓ Should reverse direction and scroll backward
- ✓ Should pause at previous key event when scrolling backward
- ✓ Speed should be same in both directions (200px/sec)

**Task 6.5: Test scroll speed accuracy**
- Measure time to scroll 400px (should be ~2 seconds at 200px/sec)
- Measure at different frame rates (if possible, throttle browser)
- ✓ Speed should be constant regardless of system performance
- Use `performance.now()` timestamps for precision
- **Validation method:** Add temporary logging: `console.log(\`Scrolled \${distance}px in \${elapsed}ms\`)`

**Task 6.6: Test boundary conditions**
- Start at beginning, press Left arrow
- ✓ Should not scroll (already at start)
- Scroll to end of timeline
- ✓ Auto-scroll should stop at timeline end
- ✓ State should return to 'idle'
- Press Right arrow at end
- ✓ Should not scroll (already at end)

**Task 6.7: Test with all 4 key events in current data**
- Key events in `data.json`:
  - evt2: 2021-02-10 "First Product Launch"
  - evt3: 2021-10-15 "First Team Offsite"
  - evt4: 2022-06-20 "Series A Funding"
  - evt6: 2023-11-15 "Second Annual Offsite"
- ✓ Should pause at all 4 events in sequence
- ✓ Each pause should trigger visual indicator
- ✓ Resume should continue to next key event

**Task 6.8: Test counter updates during auto-scroll**
- ✓ Engineers counter should update continuously as scroll passes join/departure dates
- ✓ Year counter should update when crossing year boundaries
- ✓ People lane width should update smoothly (already implemented in Slice 4)
- ✓ All updates should be synchronized with scroll position

**Task 6.9: Edge case testing**
- Rapid keypresses (Space multiple times quickly):
  - ✓ Should not cause state machine confusion
  - ✓ Should not create multiple animation loops
- Switch directions rapidly (Left/Right/Left):
  - ✓ Should handle cleanly without stuttering
- Pause exactly at key event position:
  - ✓ Should not overshoot or undershoot

---

## Success Criteria Checklist

### Core Auto-Scroll Functionality
- [ ] Press Space from idle → timeline auto-scrolls at 200px/second
- [ ] Auto-scroll uses `requestAnimationFrame`, not CSS transitions
- [ ] Scroll speed is constant (verified with timing measurements)
- [ ] Counters update continuously during auto-scroll
- [ ] Scroll stops smoothly at timeline boundaries

### Key Event Pausing
- [ ] Auto-scroll pauses automatically when reaching events where `isKeyMoment=true`
- [ ] Pause threshold is configurable (~5px from key event)
- [ ] Pauses at all 4 key events in current data in sequence
- [ ] Does not pause at regular events (where `isKeyMoment=false`)

### Visual Feedback
- [ ] Pulsing marker appears when paused at key event
- [ ] Marker highlighted in distinct color (red suggested)
- [ ] No visual indicator for manual pause (Space toggle while scrolling)
- [ ] Indicator clears when resuming scroll

### Keyboard Controls
- [ ] Space bar starts scroll from idle
- [ ] Space bar toggles pause/resume while scrolling
- [ ] Space bar resumes from key event pause
- [ ] Right arrow starts forward scroll or reverses from backward
- [ ] Left arrow starts backward scroll or reverses from forward
- [ ] All keyboard controls prevent default browser behavior

### State Machine
- [ ] Three states work correctly: idle, scrolling, paused
- [ ] State transitions are clean (no stuck states)
- [ ] Rapid keypresses don't cause state confusion
- [ ] State correctly reflects current scroll status

### Backward Scrolling
- [ ] Left arrow scrolls backward at 200px/second (same speed as forward)
- [ ] Backward scroll pauses at key events in reverse order
- [ ] Can reverse direction mid-scroll (forward → backward or vice versa)

### Integration with Previous Slices
- [ ] All Slice 3 features still work (counters update correctly)
- [ ] All Slice 4 features still work (people lane width grows during scroll)
- [ ] Event markers from Slice 2 are still visible and correctly positioned
- [ ] Lanes from Slice 1 render correctly

### Code Quality
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during auto-scroll
- [ ] High-resolution timestamps used (`performance.now()` or RAF timestamps)
- [ ] Configuration values in `config.ts`, not hardcoded
- [ ] Clean state machine logic (easy to understand)

---

## Technical Decisions

### 1. Auto-scroll implementation: `requestAnimationFrame` vs CSS transitions
**Decision:** Use `requestAnimationFrame` for auto-scroll loop  
**Rationale:**  
- CSS transitions are distance-based; auto-scroll needs speed-based (200px/sec constant)
- RAF provides precise frame timing via DOMHighResTimeStamp
- Allows monitoring position every frame for key event detection
- Can pause/resume mid-animation easily
- Matches spec requirement: "Use requestAnimationFrame for smooth 60fps animation"
- CSS transitions still used for manual panning (if we keep that feature)

### 2. Speed calculation: distance per frame
**Decision:** Calculate distance from elapsed time: `distance = speed * (elapsed / 1000)`  
**Rationale:**  
- Frame rate varies (60fps ideal, but can drop to 30fps on slower systems)
- Time-based calculation ensures constant speed regardless of frame rate
- Example: At 60fps, ~16.67ms per frame → ~3.33px per frame
- Example: At 30fps, ~33.33ms per frame → ~6.67px per frame
- Result: Same 200px/sec speed on both

### 3. Key event pause threshold
**Decision:** 5px threshold (configurable in `config.ts`)  
**Rationale:**  
- Too small (1-2px): Might miss key event between frames at high speed
- Too large (20-50px): Pauses feel premature, not aligned with marker
- 5px is ~1.5 frames at 200px/sec 60fps, good safety margin
- Configurable for easy adjustment during testing

### 4. Pause detection timing
**Decision:** Check for key events at end of each frame, after applying movement  
**Rationale:**  
- Simpler than predictive detection (checking if *next* frame will cross threshold)
- Worst case: overshoot by 1 frame distance (~3.33px at 60fps)
- Can snap back to exact position if overshoot detected
- Adequate precision for presentation use case

### 5. Visual pause indicator style
**Decision:** Pulsing red marker with thicker stroke  
**Rationale:**  
- Red is attention-grabbing, distinct from existing orange markers
- Pulse animation (2s cycle) is subtle but clear
- Thicker stroke makes marker stand out
- Easy to implement with CSS animation
- Spec suggests: "subtle pulse on event marker"

### 6. State machine architecture
**Decision:** Three states (idle/scrolling/paused), stored in ViewportController  
**Rationale:**  
- Encapsulates scroll state management in one place
- Clean separation of concerns (ViewportController = interaction + state)
- Easy to extend (e.g., add 'rewinding' state if needed)
- State-based keyboard control logic is easier to understand than if-else chains

### 7. Manual pause vs. key event pause
**Decision:** Track `pausedAtEventId` to distinguish manual from auto pause  
**Rationale:**  
- Manual pause (Space toggle): no visual indicator
- Auto pause at key event: show pulsing marker
- Same 'paused' state, but different visual feedback
- `pausedAtEventId === null` means manual pause
- `pausedAtEventId !== null` means auto pause at key event

### 8. Backward scrolling and key events
**Decision:** Detect key events in reverse order when scrolling backward  
**Rationale:**  
- Find *previous* key event (where `xPosition < currentPositionX`)
- Same pause behavior as forward scroll
- Same threshold distance (5px)
- Creates symmetric experience in both directions
- Spec says: "Left arrow reverses direction at same speed"

### 9. Timing precision
**Decision:** Use `requestAnimationFrame` timestamps (DOMHighResTimeStamp)  
**Rationale:**  
- RAF provides microsecond-precision timestamps
- More accurate than `Date.now()` (millisecond precision)
- Prevents drift over long scroll durations
- Matches spec requirement: "Use high-resolution timestamps (performance.now())"
- Note: RAF timestamp ≈ `performance.now()`, both use same time origin

### 10. Counter update mechanism during auto-scroll
**Decision:** Reuse existing `onViewportChange` callback, called every frame  
**Rationale:**  
- Already implemented in Slice 3 for manual panning
- ViewportController already has `startContinuousUpdate()` logic
- Auto-scroll loop calls `notifyViewportChange()` every frame
- No changes needed to counter update logic
- Ensures counters and lane width stay synchronized with scroll position

---

## Estimated Complexity

### Development Time Estimates:

- **Phase 1 (Config & setup):** ~20-30 minutes
  - Config additions: 5-10 min
  - Type definitions: 5-10 min
  - Pre-calculate key event positions: 10 min

- **Phase 2 (Auto-scroll engine):** ~90-120 minutes (most complex)
  - State machine properties: 10 min
  - `startAutoScroll()` method: 10 min
  - Core auto-scroll loop (Task 2.3): 30-40 min (critical path)
  - Key event pause detection (Task 2.4): 20-30 min
  - Stop/resume/toggle methods: 15-20 min
  - Modify `applyTransform()`: 10 min
  - Add state getters: 5 min

- **Phase 3 (Visual indicator):** ~20-30 minutes
  - CSS pause indicator styles: 10-15 min
  - Timeline highlight method: 10-15 min
  - Add data-id attributes: 5 min

- **Phase 4 (Keyboard controls):** ~30-40 minutes
  - Refactor Space bar logic: 10-15 min
  - Right arrow state-aware logic: 10 min
  - Left arrow state-aware logic: 10 min
  - Wire up visual indicator: 5-10 min

- **Phase 5 (Integration):** ~15-20 minutes
  - Update constructor: 5 min
  - Update instantiation: 5 min
  - Boundary conditions: 5-10 min
  - Cleanup: 5 min

- **Phase 6 (Testing & refinement):** ~45-60 minutes
  - Basic auto-scroll testing: 10 min
  - Key event pause testing: 10-15 min
  - Manual pause testing: 5 min
  - Reverse scroll testing: 10 min
  - Speed accuracy validation: 10-15 min
  - Boundary and edge cases: 10-15 min
  - Bug fixes: varies

**Total Estimated Time:** ~3.5-5 hours

**Complexity Assessment:**
- **High complexity:** Auto-scroll loop with timing (Phase 2, Task 2.3), key event detection (Phase 2, Task 2.4)
- **Medium complexity:** State machine logic, keyboard control refactor, visual indicator
- **Low complexity:** Config additions, type definitions, integration steps

**Risk areas:**
- Precise speed control at 200px/sec (requires careful timing math)
- Pause detection without overshoot
- State machine edge cases (rapid keypresses, direction reversals)
- Interaction between auto-scroll loop and existing counter update mechanism

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-004:** Camera/Viewport Control
  - Auto-scroll speed: 200 pixels/second (constant speed, not constant duration)
  - Smooth translate transform

### User Stories:
- **US-001:** Timeline Auto-Scroll
  - Space bar, right arrow, or click starts continuous auto-scroll
  - Timeline scrolls at fixed speed (200 pixels/second)
  - Auto-scroll pauses automatically when reaching any event with isKeyMoment=true
  - While paused, pressing space/right arrow/click resumes auto-scroll
  - Left arrow reverses scroll direction at same speed
  - Pressing space while scrolling toggles pause/resume

### Data Model:
- **Section 3.1:** Input JSON Schema
  - Events have `isKeyMoment` boolean property

### Interaction Flows:
- **Section 5.2:** Standard Auto-Scroll Flow
  - User presses Space/Right Arrow/Click → Start continuous auto-scroll at 200px/second
  - WHILE scrolling: Monitor for key events (isKeyMoment=true)
  - WHEN reaching event with isKeyMoment=true → Pause auto-scroll at event position
  - User presses Space/Right Arrow/Click again → Resume auto-scroll from current position

- **Section 5.3:** Pause/Resume Flow
  - WHILE auto-scrolling: User presses Space → Pause auto-scroll at current position
  - Wait for input → User presses Space again → Resume auto-scroll at 200px/second

- **Section 5.4:** Reverse Scroll Flow
  - User presses Left Arrow
  - IF currently scrolling forward → Reverse direction, scroll backward at 200px/second
  - ELSE IF paused → Start scrolling backward at 200px/second
  - Auto-scroll stops at previous key event (isKeyMoment=true)

### UI Specifications:
- **Section 4.4:** Animation Timings
  - Auto-scroll: 200px/sec linear

### Prompt Slice 5:
- "Use requestAnimationFrame for smooth 60fps animation"
- "Scroll at constant speed: 200 pixels/second"
- "Update translateX position each frame based on elapsed time"
- "Pre-calculate x-positions of all events where isKeyMoment=true"
- "Pause when reaching within ~5px of key event position"
- "States: idle, scrolling, paused"
- "Add visual indicator when paused at key event (e.g., subtle pulse on event marker)"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slices 1-4 complete (timeline rendered, viewport control, counters, lane width growth)
- ✅ ViewportController with transform application
- ✅ Event markers rendered with accessibility to modify
- ✅ D3 time scale (`xScale`) for date-to-position conversion
- ✅ Keyboard event handling in main.ts

**No new external dependencies needed:**
- All functionality uses native browser APIs (`requestAnimationFrame`, `performance.now()`)
- D3 only used for existing xScale, no new D3 features required
- CSS animations for visual indicators (native browser support)

**Compatibility:**
- `requestAnimationFrame`: Supported in all modern browsers
- `DOMHighResTimeStamp`: Supported in Chrome 140 (target browser)
- CSS animations: Broad support

---

## Implementation Notes

### Code organization:
```
src/
├── main.ts                      # (Modified) Refactor keyboard controls for state machine
├── viewport-controller.ts       # (Major modifications) Add auto-scroll engine and state machine
├── timeline.ts                  # (Modified) Add getKeyEventPositions() and highlightEvent()
├── config.ts                    # (Modified) Add auto-scroll configuration
├── types.ts                     # (Modified) Add ScrollState and related types
└── style.css                    # (Modified) Add pause indicator styles
```

### Key methods to add/modify:

**In ViewportController:**
```typescript
// New state machine properties
private scrollState: ScrollState = 'idle';
private scrollDirection: ScrollDirection = 'forward';
private keyEventPositions: KeyEventPosition[] = [];
private lastFrameTimestamp: number | null = null;
private autoScrollFrameId: number | null = null;
private pausedAtEventId: string | null = null;

// New public methods
public startAutoScroll(direction: ScrollDirection): void
public stopAutoScroll(): void
public resumeAutoScroll(): void
public togglePause(): void
public getScrollState(): ScrollState
public getScrollDirection(): ScrollDirection
public getPausedEventId(): string | null

// New private methods
private autoScrollLoop(timestamp: number): void
private checkForKeyEventPause(): boolean
private applyTransform(useTransition: boolean = true): void // Modified signature
```

**In Timeline:**
```typescript
public getKeyEventPositions(): KeyEventPosition[]
public highlightEvent(eventId: string | null): void
```

**In main.ts:**
```typescript
// Modified keyboard control function
function setupKeyboardControls(
  viewportController: ViewportController,
  timeline: Timeline
): void
```

### Potential gotchas:

1. **Frame timing accuracy:** Ensure elapsed time calculation handles first frame (when `lastFrameTimestamp === null`)
2. **Animation loop lifecycle:** Must cancel `requestAnimationFrame` when stopping/pausing to prevent memory leaks
3. **CSS transition conflicts:** Auto-scroll must disable CSS transitions during loop, but manual panning should keep them
4. **State synchronization:** Pause indicator must clear when leaving paused state (not just when entering)
5. **Direction reversal:** Must stop current loop and restart when reversing direction
6. **Boundary clamping:** Must check boundaries every frame, not just at start/end of scroll
7. **Key event ordering:** Pre-calculated positions must be sorted ascending for forward/backward search
8. **Overshoot prevention:** If pause detection happens after crossing threshold, may need to snap back

### Implementation order (recommended):

1. **Start with Phase 1:** Config and key event position pre-calculation (independent, can test in isolation)
2. **Then Phase 2, Tasks 2.1-2.3:** Basic auto-scroll loop without pause detection (test constant speed)
3. **Then Phase 2, Task 2.4:** Add pause detection (test with logging before visual indicator)
4. **Then Phase 3:** Add visual indicator (validate pause detection working)
5. **Then Phase 2, Tasks 2.5-2.7:** Add stop/resume/toggle methods
6. **Then Phase 4:** Refactor keyboard controls (brings everything together)
7. **Then Phase 5:** Integration and boundary handling
8. **Finally Phase 6:** Comprehensive testing and refinement

### Debugging tips:

- Add temporary logging in auto-scroll loop:
  ```typescript
  console.log(`Frame ${frameCount}: offset=${currentOffset.toFixed(1)}px, elapsed=${elapsed.toFixed(1)}ms, distance=${distance.toFixed(2)}px`);
  ```
- Log state transitions:
  ```typescript
  console.log(`State: ${oldState} → ${newState}`);
  ```
- Log key event detection:
  ```typescript
  console.log(`Approaching key event "${eventName}" at x=${xPosition}px, current=${currentX}px, distance=${distance}px`);
  ```
- Use browser DevTools Performance tab to verify 60fps frame rate
- Use Timeline recording to visualize `requestAnimationFrame` callbacks

---

## Open Questions (Clarify with user if needed)

1. **Photo moments:** Slice 5 prompt says "All Slice 3-4 features continue working", but spec mentions photo display for key events (hasPhoto=true). Are photos in scope for Slice 5, or later slice?
   - **Decision:** Photos are out of scope for Slice 5 (no data currently has hasPhoto=true). Focus on pause behavior only.

2. **Snap to exact position:** When pause detected, should we snap to exact key event x-position, or stop at current position?
   - **Suggestion:** Snap to exact position for visual alignment. Implement as optional behavior (easy to toggle).

3. **Resume after photo:** Spec says "Auto-resume after 2.5s OR wait for keypress" for photo events. Is auto-resume in scope?
   - **Decision:** Out of scope for Slice 5 (no photos yet). Manual resume only (keypress).

4. **Click to start:** Spec mentions "click starts auto-scroll" but we have no click handlers yet. Add in Slice 5?
   - **Suggestion:** Defer to later slice. Keyboard controls sufficient for MVP. Add click handler to viewport if time permits.

---

**Last Updated:** 2025-10-26  
**Next Step:** Review plan with user, then begin Phase 1 implementation


