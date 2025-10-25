# Slice 3 Implementation Plan: Manual Scroll Control + Counter Updates

**Status:** Ready for Implementation  
**Created:** 2025-10-25

---

## Context Analysis

✅ **Already in place from Slices 1-2:**
- Timeline SVG container with three lanes rendered
- D3 time scale (`xScale`) for date-to-position mapping  
- Event markers with vertical lines and text labels
- Year gridlines with labels
- Data loading working with 5 people, 3 projects, 6 events
- Static layout - no viewport control yet
- No interactivity - timeline shows full width

❌ **Not yet implemented (needed for Slice 3):**
- Keyboard event listeners
- Viewport/camera control (currently shows full timeline)
- CSS transform-based panning
- Counter display UI
- Real-time counter calculations based on viewport position

---

## Detailed Task Breakdown

### Phase 1: Viewport Configuration & Container Setup
**Status:** ✅ Complete

**Task 1.1: Add viewport/camera configuration to `config.ts`** ✅ DONE
- Add scroll configuration:
  - `panDistance: 400` (px to move per keypress)
  - `transitionDuration: 600` (ms for smooth panning)
  - `transitionEasing: 'ease-out'`
- Add counter configuration:
  - Position (top-right, with padding)
  - Font settings (18px, medium weight)
  - Spacing between counter items

**Task 1.2: Restructure HTML container for scrolling** ✅ DONE
- Modify `index.html` to add:
  - Wrapper div with fixed viewport size (1200px × 800px)
  - Inner scrollable container for timeline SVG
  - Counter display div (fixed position, top-right)
- Apply CSS for:
  - `overflow: hidden` on wrapper
  - Fixed positioning for counter display
  - Flexbox layout for viewport structure

**Rationale:** Need proper container hierarchy to enable CSS transform-based panning without native scrollbars.

---

### Phase 2: Keyboard Controls & Panning Logic
**Status:** ✅ Complete

**Task 2.1: Create ViewportController class in new file `viewport-controller.ts`** ✅ DONE
- Properties:
  - `currentOffset: number` (current translateX value in px)
  - `timelineWidth: number` (total timeline width)
  - `viewportWidth: number` (visible viewport width)
  - `maxOffset: number` (calculated based on current position ratio)
  - `minOffset: number` (negative value for left padding)
  - `isAnimating: boolean` (prevent overlapping transitions)
- Methods:
  - `panRight(distance: number): void`
  - `panLeft(distance: number): void`
  - `getCurrentCenterDate(): Date` (returns date at current position marker)
  - `applyTransform(animate?: boolean): void` (applies CSS translateX)
- **Note:** Uses `LAYOUT.scroll.currentPositionRatio` (0.75) from config for "current" date position. Timeline starts with negative offset to position first event at this marker. Comments reference the config constant rather than hardcoding percentages.

**Task 2.2: Implement keyboard event handling** ✅ DONE
- Add event listener for `keydown` events in `main.ts`
- Handle three keys:
  - **Space bar** (`key === ' '`) → pan right by 400px
  - **Right arrow** (`key === 'ArrowRight'`) → pan right by 400px
  - **Left arrow** (`key === 'ArrowLeft'`) → pan left by 400px
- Call `ViewportController` methods for panning
- Prevent default browser behavior (space bar scrolling page)
- **Implementation:** Added `setupKeyboardControls()` function in main.ts, created ViewportController instance after timeline render, added getter methods to Timeline class to expose necessary data

**Task 2.3: Implement smooth CSS transform panning** ✅ DONE (implemented in Task 2.1)
- Apply `transform: translateX(Xpx)` to timeline container
- Use CSS transitions for smooth animation:
  - `transition: transform 600ms ease-out`
- Clamp offset to valid range: `[minOffset, maxOffset]`
- Prevent new panning if transition in progress (`isAnimating` flag)
- **Implementation:** Already implemented in ViewportController.applyTransform() method, CSS transition defined in style.css

**Rationale:** CSS transforms are more performant than DOM scrolling and provide smoother animations. ViewportController centralizes scroll state management.

---

### Phase 3: Counter Display UI
**Status:** ✅ Complete (implemented in Phase 1)

**Task 3.1: Create counter HTML structure** ✅ DONE (completed in Task 1.2)
- Add counter container to `index.html`:
```html
<div id="counters" class="counters">
  <span id="counter-engineers" class="counter">Engineers: 0</span>
  <span class="counter-separator">|</span>
  <span id="counter-projects" class="counter">Projects: 0</span>
  <span class="counter-separator">|</span>
  <span id="counter-year" class="counter">Year: 2020</span>
</div>
```

**Task 3.2: Add counter styles to `style.css`** ✅ DONE (completed in Task 1.2)
- Position: fixed top-right with padding (e.g., `top: 20px, right: 40px`)
- Font: 18px, medium weight (500), sans-serif
- Layout: inline flex with spacing between items
- Color: `#2C3E50` (matches text color)
- Z-index: ensure counters appear above timeline

**Rationale:** Fixed positioning keeps counters visible during panning. Inline layout with separators provides clear visual hierarchy.

---

### Phase 4: Counter Calculation Logic
**Status:** Pending

**Task 4.1: Create CounterCalculator class in new file `counter-calculator.ts`**
- Constructor takes `TimelineData` and `xScale`
- Methods:
  - `getActiveEngineersAt(date: Date): number`
    - Count people where `joined <= date` AND (`left === null` OR `left > date`)
  - `getActiveProjectsAt(date: Date): number`
    - Count projects where `start <= date` AND (`end === null` OR `end > date`)
  - `getYearAt(date: Date): number`
    - Extract 4-digit year from date

**Task 4.2: Implement date parsing utilities**
- Reuse `parseDate()` method from Timeline class (consider moving to shared utils)
- Parse person `joined`/`left` dates
- Parse project `start`/`end` dates
- Handle null dates (currently active)

**Rationale:** Encapsulates business logic for counting active entities. Separates calculation from UI update logic for testability.

---

### Phase 5: Counter Updates Integration
**Status:** Pending

**Task 5.1: Connect counter updates to viewport changes**
- In `ViewportController.applyTransform()`:
  - Calculate center date after transform
  - Call counter update method
- Create `updateCounters(date: Date)` method in main app
  - Use `CounterCalculator` to get counts
  - Update DOM elements with new values

**Task 5.2: Implement counter display updates**
- Select counter DOM elements in `main.ts`
- Update text content on viewport changes:
  - `#counter-engineers` → `"Engineers: X"`
  - `#counter-projects` → `"Projects: Y"`
  - `#counter-year` → `"Year: YYYY"`
- Update on:
  - Initial page load (show year 2020, 0 engineers, 0 projects)
  - After each pan animation completes

**Task 5.3: Handle transition timing**
- Option A: Update counters after CSS transition completes (use `transitionend` event)
- Option B: Update counters continuously during transition (use requestAnimationFrame)
- **Decision:** Start with Option A (simpler), can enhance to Option B if needed

**Rationale:** Updating after transition completion is simpler and avoids visual "flickering" during panning. Can enhance to real-time updates if user feedback requires it.

---

### Phase 6: Initial State & Testing
**Status:** Pending

**Task 6.1: Set initial viewport state**
- Timeline starts at leftmost position (offset = 0)
- Show year 2020 in viewport
- Initial counters:
  - Engineers: 0 (no one joined yet in early 2020)
  - Projects: 0 (no projects started yet)
  - Year: 2020

**Task 6.2: Test keyboard controls**
- Verify Space and Right arrow pan right by ~400px
- Verify Left arrow pans left by ~400px
- Verify smooth transition (not jumpy)
- Verify panning stops at timeline boundaries (can't pan beyond start/end)

**Task 6.3: Test counter accuracy**
- Pan to mid-2020 (after Alice and Bob join):
  - Engineers should show 2
- Pan to mid-2021 (after Carol and David join):
  - Engineers should show 4
  - Projects should show 2 (Platform v1, Mobile App)
- Pan to mid-2023 (after Carol leaves):
  - Engineers should show 4 (Alice, Bob, David, Emma)
  - Projects should show 2 (Mobile App ended, but Platform v1 and Analytics Dashboard active)

**Task 6.4: Edge case testing**
- Pan to very beginning (2020-01-01): all counters should be 0
- Pan to very end (2024-12-31): counters show final state
- Rapid keypresses: should not cause overlapping animations or incorrect counts
- Press Left arrow at timeline start: should not pan beyond 0
- Press Right arrow at timeline end: should not pan beyond maxOffset

---

## Success Criteria Checklist

- [ ] Space bar pans timeline right by ~400px
- [ ] Right arrow pans timeline right by ~400px
- [ ] Left arrow pans timeline left by ~400px
- [ ] Panning uses smooth CSS transition (visible easing, not instant)
- [ ] Timeline stays within bounds (doesn't scroll beyond start/end)
- [ ] Three counters visible in top-right corner at all times
- [ ] "Engineers: X" shows count of active people at viewport center
- [ ] "Projects: Y" shows count of active projects at viewport center  
- [ ] "Year: YYYY" shows 4-digit year at viewport center
- [ ] Counters update after each pan completes
- [ ] Initial state shows Year: 2020, Engineers: 0, Projects: 0
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during interaction
- [ ] Keyboard events don't trigger browser default behavior (e.g., page scroll)

---

## Technical Decisions

### 1. Viewport control approach
**Decision:** CSS `transform: translateX()` instead of native scroll  
**Rationale:**  
- Better animation control (CSS transitions vs. scrollIntoView)
- No visible scrollbars (cleaner presentation UI)
- Easier to constrain panning to fixed increments
- More consistent cross-browser behavior

### 2. Counter calculation timing
**Decision:** Calculate counts at configurable viewport position (`LAYOUT.scroll.currentPositionRatio` = 0.75, not center at 0.5)  
**Rationale:**  
- Position further from left edge provides better presentation flow - shows what's coming while keeping focus on current moment
- Allows more preview of upcoming events on the right side
- Timeline starts with left padding (negative offset) so first event can appear at this position initially
- Simplifies calculation logic (single point instead of range)
- Configured in one place (`config.ts`) for easy adjustment without updating comments throughout code

### 3. Date comparison logic for "active" status
**Decision:** Use inclusive start date, exclusive end date (SQL-style intervals)  
**Rationale:**  
- Person is active if `joined <= date < left`
- Project is active if `start <= date < end`
- Handles null end dates (currently active)
- Matches common interval semantics

### 4. Architecture - separate ViewportController class
**Decision:** Create dedicated `ViewportController` class instead of adding to Timeline  
**Rationale:**  
- Separates concerns (rendering vs. interaction)
- Timeline class already responsible for SVG rendering
- ViewportController can be unit tested independently
- Easier to extend later with auto-scroll (Slice 4+)

### 5. Counter update strategy
**Decision:** Update after transition completes (not during)  
**Rationale:**  
- Simpler implementation for prototype
- Avoids "flickering" numbers during pan animation
- Sufficient for presenter use case (not rapid gaming input)
- Can enhance to continuous updates if needed

---

## Estimated Complexity

### Development Time Estimates:
- **Phase 1 (Container setup):** ~20-30 minutes
  - Config additions: 5 min
  - HTML/CSS restructuring: 15-25 min

- **Phase 2 (Keyboard & panning):** ~45-60 minutes
  - ViewportController class: 25-35 min
  - Keyboard event handling: 10-15 min
  - CSS transform implementation: 10 min

- **Phase 3 (Counter UI):** ~15-20 minutes
  - HTML structure: 5 min
  - CSS styling: 10-15 min

- **Phase 4 (Counter logic):** ~30-40 minutes
  - CounterCalculator class: 20-25 min
  - Date parsing utilities: 10-15 min

- **Phase 5 (Integration):** ~25-35 minutes
  - Wire up counter updates: 15-20 min
  - Transition timing handling: 10-15 min

- **Phase 6 (Testing & refinement):** ~30-40 minutes
  - Manual testing: 20-25 min
  - Bug fixes: 10-15 min

**Total Estimated Time:** ~2.5-3.5 hours

**Complexity Assessment:**
- **Low complexity:** Counter UI, config additions
- **Medium complexity:** ViewportController, counter calculations  
- **Higher complexity:** Keyboard event coordination, transition timing

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-004:** Camera/Viewport Control (viewport dimensions, scroll behavior)
- **FR-005:** Counters & Metrics (counter format, positioning, update logic)

### User Stories:
- **US-001:** Timeline Auto-Scroll (keyboard controls defined here)
  - Acceptance criteria for Space bar, arrow keys
  - Note: Full auto-scroll comes in later slices, Slice 3 is manual control only

### Data Model:
- **Section 3.1:** Input JSON Schema
  - Person schema (joined, left dates)
  - Project schema (start, end dates)
- **Section 3.2:** Derived State (engineer/project counts)

### UI Specifications:
- **Section 4.1:** Layout & Dimensions (viewport 1200×800)
- **Section 4.3:** Typography (counter font: 18px, medium weight)

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slices 1-2 complete (lanes, event markers rendered)
- ✅ D3 time scale (`xScale`) available
- ✅ Data loaded with people and projects arrays

**No external dependencies needed:**
- All functionality uses native browser APIs (KeyboardEvent, CSS transforms)
- D3 only used for existing scale, no new D3 features required

---

## Implementation Notes

### Code organization:
```
src/
├── main.ts                    # (Modified) Add keyboard listeners, wire up components
├── timeline.ts                # (Unchanged) SVG rendering only
├── viewport-controller.ts     # (New) Panning logic and state
├── counter-calculator.ts      # (New) Business logic for counting active entities
├── config.ts                  # (Modified) Add viewport/counter config
├── style.css                  # (Modified) Add counter and viewport styles
└── types.ts                   # (Possibly modified) Add interfaces if needed
```

### Key interfaces to add:
```typescript
// In types.ts or viewport-controller.ts
interface ViewportState {
  currentOffset: number;
  centerDate: Date;
  isAnimating: boolean;
}
```

### Potential gotchas:
1. **CSS transition conflicts:** Ensure only one transition active at a time
2. **Date parsing:** People/projects use same ISO format as events, can reuse parsing logic
3. **Boundary checking:** Timeline can be shorter than viewport if < 3 years of data
4. **Initial render:** Counters must update on page load, not just after first keypress
5. **Active count logic:** Watch out for inclusive vs. exclusive date comparisons

---

**Last Updated:** 2025-10-25  
**Next Step:** Review plan, then begin Phase 1 implementation

