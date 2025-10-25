# Slice 4 Implementation Plan: Dynamic Lane Width Growth (People Only)

**Status:** Ready for Implementation  
**Created:** 2025-10-25

---

## Context Analysis

✅ **Already in place from Slices 1-3:**
- Timeline SVG with three lanes rendered (projects, events, people)
- D3 time scale (`xScale`) for date-to-position mapping
- ViewportController with continuous updates during scrolling via `requestAnimationFrame`
- CounterCalculator with `getActiveEngineersAt(date)` method
- `onViewportChange` callback mechanism that fires continuously during scroll
- People lane rendered as `<line>` element with class `lane-people`
- CSS transitions configured (600ms ease-out for panning)

❌ **Not yet implemented (needed for Slice 4):**
- Precomputed cumulative headcount timeline
- Function to calculate stroke width at any timestamp
- Dynamic updating of people lane stroke width
- D3 transition for smooth width changes (separate from panning transition)

✅ **Already available for reuse:**
- `ViewportController.getCurrentCenterDate()` - determines "current" viewport date (at 75% position)

---

## Detailed Task Breakdown

### Phase 1: Configuration & Types
**Status:** Pending

**Task 1.1: Add lane width growth configuration to `config.ts`**
- Add lane width animation settings:
  - `laneWidthTransitionDuration: 300` (ms - 0.3s per spec)
  - `laneWidthTransitionEasing: 'ease-out'`
- Add people lane width calculation constants:
  - `baseStrokeWidth: 2` (px - matches existing `initialStrokeWidth`)
  - `pixelsPerPerson: 1` (px to add per active person)
- **Rationale:** Centralizes magic numbers for easy tuning. Separates lane width animation (0.3s) from panning animation (0.6s).

**Task 1.2: Add types for headcount timeline data (if needed)**
- Consider adding interface for timeline points:
```typescript
interface HeadcountTimelinePoint {
  date: Date;
  count: number; // cumulative headcount at this date
}
```
- May be internal to new class, not necessarily in `types.ts`
- **Decision:** Keep types minimal for prototype. Use simple array if sufficient.

---

### Phase 2: Cumulative Headcount Calculation
**Status:** Pending

**Task 2.1: Create `PeopleLaneWidthCalculator` class in new file `people-lane-width-calculator.ts`**
- Constructor takes `Person[]` array (not full `TimelineData` - more reusable)
- Private property: `headcountTimeline: Array<{ date: Date, count: number }>`
- Methods:
  - `private buildHeadcountTimeline(): void` - precomputes cumulative headcount
  - `public getHeadcountAt(date: Date): number` - lookup headcount at any date
  - `public getStrokeWidthAt(date: Date): number` - formula: `2 + headcount`
- **Design note:** Generic enough to be adapted for projects in Slice 8 (could extract base class later)

**Task 2.2: Implement `buildHeadcountTimeline()` method**
- Algorithm:
  1. Collect all join and departure dates from `people` array
  2. Create array of events: `{ date: Date, delta: +1 or -1 }`
     - For each person: add join event with delta +1
     - For each person with non-null `left`: add departure event with delta -1
  3. Sort events chronologically
  4. Calculate cumulative count at each event
  5. Store sorted array of `{ date, count }` points
- Handle edge cases:
  - Multiple people joining/leaving on same day (sum deltas)
  - Timeline start date (count = 0)
  - People with `left: null` (only join event, no departure)
- **Implementation detail:** Use `Map<dateString, number>` to aggregate same-day events before sorting
- **Design for reusability:** Algorithm is generic - works for any entity with start/end dates (people, projects)
- **Rationale:** Precomputation at load time avoids recalculating during scroll

**Task 2.3: Implement `getHeadcountAt(date: Date)` lookup method**
- Binary search through sorted `headcountTimeline` array
- Find largest date <= query date
- Return associated count
- Handle edge cases:
  - Date before timeline start → return 0
  - Date after all events → return last count
- **Alternative:** Use `d3.bisector` for efficient binary search
- **Rationale:** O(log n) lookup enables real-time updates during scroll

**Task 2.4: Implement `getStrokeWidthAt(date: Date)` calculation**
- Formula: `strokeWidth = LAYOUT.lanes.people.baseStrokeWidth + (headcount * LAYOUT.lanes.people.pixelsPerPerson)`
- With defaults: `strokeWidth = 2 + headcount`
- Simple wrapper around `getHeadcountAt()`
- **Rationale:** Encapsulates business logic, makes formula explicit and configurable

**Task 2.5: Add validation logging**
- Log precomputed timeline points to console on init
- Example output:
  ```
  Headcount timeline: 5 events
  2020-03-01: 0 → 1 (Alice joined)
  2020-05-15: 1 → 2 (Bob joined)
  2021-06-10: 2 → 3 (Carol joined)
  2023-02-01: 3 → 2 (Carol left)
  ...
  ```
- Verify against known data (e.g., 5 people in `data.json` → expected join/leave events)
- **Rationale:** Early validation catches date parsing bugs and algorithm errors

---

### Phase 3: Timeline Rendering Updates
**Status:** Pending

**Task 3.1: Add method to Timeline class: `updatePeopleLaneWidth(width: number)`**
- Select people lane: `this.svg.select('.lane-people')`
- Apply D3 transition:
  ```typescript
  selection
    .transition()
    .duration(LAYOUT.lanes.people.widthTransitionDuration)
    .ease(d3.easeOut)
    .attr('stroke-width', width)
  ```
- Store reference to lane selection as class property for efficient updates
- **Rationale:** Encapsulates SVG manipulation in Timeline class, not in main.ts

**Task 3.2: Store lane selection as class property**
- In `renderLanes()`, save selection:
  ```typescript
  this.peopleLaneSelection = lanesGroup.append('line')...
  ```
- Type: `d3.Selection<SVGLineElement, unknown, null, undefined>`
- Allows direct updates without re-querying DOM
- **Rationale:** Performance optimization for frequent updates during scroll

**Task 3.3: Add getter method for external updates**
- Public method: `updatePeopleLaneWidth(width: number): void`
- Called by main.ts when viewport changes
- **Decision:** Timeline class owns rendering, but accepts external commands
- **Rationale:** Maintains separation of concerns (Timeline = rendering, ViewportController = interaction)

---

### Phase 4: Integration with Viewport Scrolling
**Status:** Pending

**Task 4.1: Instantiate `PeopleLaneWidthCalculator` in `main.ts`**
- Create after loading data:
  ```typescript
  const peopleLaneWidthCalculator = new PeopleLaneWidthCalculator(data.people);
  ```
- Place alongside `CounterCalculator` instantiation

**Task 4.2: Create lane width update callback**
- New function in main.ts:
  ```typescript
  const updateLaneWidth = (date: Date): void => {
    const strokeWidth = peopleLaneWidthCalculator.getStrokeWidthAt(date);
    timeline.updatePeopleLaneWidth(strokeWidth);
  };
  ```
- Call on viewport changes (same trigger as counter updates)

**Task 4.3: Connect callback to ViewportController**
- **Option A:** Add second callback parameter to ViewportController
- **Option B:** Combine with existing `updateCounters` callback
- **Decision:** Option B - merge into single callback to avoid duplicate date calculations
- Modified callback:
  ```typescript
  const updateViewportState = (date: Date): void => {
    // Update counters
    const engineers = counterCalculator.getActiveEngineersAt(date);
    ...
    
    // Update lane width
    const strokeWidth = peopleLaneWidthCalculator.getStrokeWidthAt(date);
    timeline.updatePeopleLaneWidth(strokeWidth);
  };
  ```
- **Rationale:** Single callback is simpler, ensures counters and lane width stay in sync

**Task 4.4: Set initial lane width**
- After timeline render, set initial width based on start date:
  ```typescript
  const initialDate = timeline.getStartDate();
  const initialWidth = peopleLaneWidthCalculator.getStrokeWidthAt(initialDate);
  timeline.updatePeopleLaneWidth(initialWidth);
  ```
- Should be 2px at very start of timeline (0 people)
- Ensures consistent state before first scroll
- **Rationale:** Explicit initialization avoids relying on callback timing

---

### Phase 5: Transition Timing & Smoothness
**Status:** Pending

**Task 5.0: Add more test data**
- User will provide additional test data with more people join/leave events
- Update `data.json` with new data
- **Purpose:** Better validation of lane width growth with realistic data volume
- **Note:** Wait for user to provide data before proceeding with this phase

**Task 5.1: Test transition performance during scroll**
- Verify no "jank" or stuttering during continuous scroll
- Check that lane width transitions don't conflict with pan transitions
- Monitor frame rate in DevTools Performance tab
- **Expected behavior:** Smooth width changes, no visual jumps

**Task 5.2: Handle rapid width changes**
- If headcount changes faster than transition duration:
  - D3 transitions automatically interrupt and replace previous transition
  - Should work correctly by default
- Test with data having many close-together join dates
- **Edge case:** Multiple joins within 300ms window

**Task 5.3: Optimize if needed**
- If performance issues:
  - **Option A:** Throttle updates (skip intermediate frames)
  - **Option B:** Reduce transition duration
  - **Option C:** Use CSS transitions instead of D3
- **Decision:** Start with spec values (0.3s), only optimize if problems observed
- **Rationale:** Premature optimization avoided; prototype can tolerate minor performance issues

---

### Phase 6: Testing & Validation
**Status:** Pending

**Task 6.1: Test initial state**
- Verify lane starts at 2px width (before any joins)
- Check against visual inspection (compare to events lane at 8px)
- **Expected:** People lane thinner than events lane initially

**Task 6.2: Test width growth during scroll**
- Pan through timeline manually (Space bar)
- Observe lane thickness increasing as people join
- Check specific points:
  - After Alice joins (2020-03-01): width = 2 + 1 = 3px
  - After Bob joins (2020-05-15): width = 2 + 2 = 4px
  - After 5th person joins: width = 2 + 5 = 7px
- **Validation:** Use browser DevTools to inspect `stroke-width` attribute

**Task 6.3: Test width decrease when people leave**
- Pan to date after Carol leaves (2023-02-01)
- Width should decrease by 1px
- **Expected:** Smooth transition, not instant jump
- Check that width doesn't go below 2px (base width)

**Task 6.4: Test with keyboard navigation from Slice 3**
- Use Left/Right arrows to pan
- Verify lane width updates during transition
- Counters and lane width should stay synchronized
- **Expected:** Continuous updates via `requestAnimationFrame`

**Task 6.5: Test edge cases**
- Pan to very start of timeline (2020-01-01):
  - Width = 2px (0 people)
- Pan to very end of timeline (2024-12-31):
  - Width = 2 + (total joins - total departures)
  - With sample data (5 joins, 1 departure): width = 2 + 4 = 6px
- Multiple people joining same day:
  - Width should increase by N px in single transition
- People with `left: null`:
  - Count should remain active through end of timeline

**Task 6.6: Visual comparison**
- Compare final width at timeline end to spec:
  - Spec mentions "2px → 15px → 62px" as example progression
  - With real data (~60 engineers): 2 + 60 = 62px ✓
- Verify visual impact is noticeable (lane clearly thickens)
- **Success criteria:** Presenter can easily see team growth

---

## Success Criteria Checklist

- [ ] People lane starts at 2px width at timeline start
- [ ] Width increases by 1px for each person join
- [ ] Width decreases by 1px for each person departure
- [ ] Smooth D3 transition (0.3s ease-out) when scrolling
- [ ] No visual jumps or stuttering during continuous scroll
- [ ] Lane width updates work with keyboard navigation (Space, arrows)
- [ ] Final width at timeline end = 2 + (total active people)
- [ ] Initial width before first join = 2px (base width)
- [ ] Headcount timeline precomputed correctly (logged to console)
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during scrolling
- [ ] Lane width stays synchronized with counter values
- [ ] Width updates continuously during scroll, not just on pause

---

## Technical Decisions

### 1. Separate PeopleLaneWidthCalculator vs. extend CounterCalculator
**Decision:** Create separate `PeopleLaneWidthCalculator` class  
**Rationale:**  
- CounterCalculator uses on-demand filtering (iterates all people per query)
- PeopleLaneWidthCalculator uses precomputed timeline (O(log n) binary search)
- Different architectural patterns justify separate classes
- Keeps CounterCalculator simple and focused
- Takes only `Person[]` array for better reusability (pattern can be adapted for projects in Slice 8)

### 2. Precomputation vs. on-demand calculation
**Decision:** Precompute cumulative headcount timeline at load time  
**Rationale:**  
- Called very frequently (every frame during scroll via `requestAnimationFrame`)
- Data is static (doesn't change after load)
- O(log n) binary search much faster than O(n) filtering
- Small memory overhead (~10-100 timeline points for typical dataset)
- Matches spec recommendation: "Build a sorted timeline array"

### 3. Stroke width formula
**Decision:** `strokeWidth = 2 + activeHeadcount` (not `2 + totalJoins`)  
**Rationale:**  
- Spec says "Add 1px per person currently active"
- Must decrease when people leave (not just increase)
- Matches counter semantics (active = joined and not left)
- Formula in config for easy adjustment

### 4. Lane width transition timing
**Decision:** Use D3 transition (0.3s ease-out), separate from pan transition (0.6s)  
**Rationale:**  
- Spec explicitly states: "lane width growth: 0.3s ease-out"
- Faster transition than panning (0.3s vs 0.6s) creates responsive feel
- D3 transitions allow automatic interruption (handles rapid changes gracefully)
- Decouples lane animation from viewport animation

### 5. Update trigger
**Decision:** Continuous updates during scroll (same as counters)  
**Rationale:**  
- Already implemented in Slice 3 via `requestAnimationFrame`
- Ensures lane width reflects viewport position in real-time
- Counters and lane width stay synchronized
- No additional implementation needed beyond callback integration

### 6. Date for width calculation
**Decision:** Use `viewportController.getCurrentCenterDate()` (at 75% position, not 50%)  
**Rationale:**  
- Reuses existing logic from Slice 3
- Configured via `LAYOUT.scroll.currentPositionRatio` (0.75)
- Consistent with counter calculation semantics
- Lane width represents "current team size" at position marker

### 7. Binary search implementation
**Decision:** Use d3-array's `bisector` utility  
**Rationale:**  
- Already have D3 as dependency
- Well-tested, handles edge cases
- Cleaner API than manual binary search
- Example: `const bisectDate = d3.bisector(d => d.date).left`

---

## Estimated Complexity

### Development Time Estimates:
- **Phase 1 (Config & types):** ~10-15 minutes
  - Config additions: 5-10 min
  - Type definitions: 5 min (if needed)

- **Phase 2 (Headcount calculation):** ~45-60 minutes
  - PeopleLaneWidthCalculator class structure: 10 min
  - buildHeadcountTimeline() implementation: 20-25 min
  - getHeadcountAt() with binary search: 10-15 min
  - getStrokeWidthAt() wrapper: 5 min
  - Validation logging: 5-10 min

- **Phase 3 (Timeline rendering):** ~20-30 minutes
  - Store lane selection: 5 min
  - updatePeopleLaneWidth() method: 10-15 min
  - D3 transition setup: 5-10 min

- **Phase 4 (Integration):** ~15-25 minutes
  - Instantiate calculator: 5 min
  - Create callback: 5-10 min
  - Wire up to ViewportController: 5-10 min

- **Phase 5 (Transition tuning):** ~15-20 minutes
  - Test performance: 10 min
  - Optimize if needed: 5-10 min

- **Phase 6 (Testing & validation):** ~30-40 minutes
  - Manual testing all scenarios: 20-25 min
  - Edge case testing: 10-15 min

**Total Estimated Time:** ~2-3 hours

**Complexity Assessment:**
- **Low complexity:** Config, integration, initial width
- **Medium complexity:** Headcount timeline precomputation, D3 transitions
- **Higher complexity:** Binary search implementation, transition timing during scroll

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-001:** Three-Lane Layout - people lane width specification (starts at 2px, grows with people)
- **US-003:** Growth Visualization - acceptance criteria for width growth
  - "People lane starts at 2px stroke width"
  - "People lane increases by 1px for each person joining"
  - "People lane decreases by 1px for each person leaving"

### Data Model:
- **Section 3.1:** Input JSON Schema - people array with `joined` and `left` dates
- **Section 3.2:** Derived State - `peopleStrokeWidth` as computed property

### UI Specifications:
- **Section 4.4:** Animation Timings - "Lane width growth: 0.3s ease-out"

### Prompt Slice 4:
- "Precompute cumulative headcount at each significant date"
- "Create function to calculate stroke width at any timestamp"
- "Update people lane stroke-width as timeline scrolls"
- "Use viewport center position to determine current date"
- "Apply stroke-width with smooth D3 transition (0.3s ease-out)"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slices 1-3 complete (lanes rendered, viewport scrolling, counters working)
- ✅ ViewportController with continuous updates (`requestAnimationFrame`)
- ✅ `onViewportChange` callback mechanism
- ✅ CounterCalculator (provides pattern to follow)
- ✅ D3 loaded and xScale available

**No new dependencies needed:**
- All functionality uses existing D3 features (transitions, bisector)
- No new libraries or tools required

---

## Implementation Notes

### Code organization:
```
src/
├── main.ts                           # (Modified) Instantiate PeopleLaneWidthCalculator, wire up callback
├── timeline.ts                       # (Modified) Add updatePeopleLaneWidth() method
├── people-lane-width-calculator.ts   # (New) Precompute and lookup cumulative headcount
├── counter-calculator.ts             # (Unchanged) Keep separate for now
├── viewport-controller.ts            # (Unchanged) Already has continuous updates
├── config.ts                         # (Modified) Add lane width animation config
└── types.ts                          # (Possibly modified) Add HeadcountTimelinePoint if needed
```

### Key classes/methods to add:
```typescript
// In people-lane-width-calculator.ts
export class PeopleLaneWidthCalculator {
  private headcountTimeline: Array<{ date: Date, count: number }>;
  
  constructor(people: Person[]) {
    this.buildHeadcountTimeline(people);
  }
  
  private buildHeadcountTimeline(people: Person[]): void { ... }
  public getHeadcountAt(date: Date): number { ... }
  public getStrokeWidthAt(date: Date): number { ... }
}

// In timeline.ts
export class Timeline {
  private peopleLaneSelection: d3.Selection<...> | null = null;
  
  public updatePeopleLaneWidth(width: number): void { ... }
}
```

### Potential gotchas:
1. **D3 transition conflicts:** Multiple overlapping transitions on same element
   - Solution: D3 automatically interrupts previous transitions ✓
2. **Same-day events:** Multiple joins/departures on same date
   - Solution: Aggregate deltas before creating timeline points
3. **Date comparison precision:** Time component (00:00:00) might matter
   - Solution: Use consistent Date parsing from data-loader.ts
4. **Initial width:** Lane might render before callback fires
   - Solution: Explicit initial width call after render()
5. **Binary search edge cases:** Date before/after all events
   - Solution: Handle bounds explicitly in getHeadcountAt()
6. **Transition performance:** 60fps during continuous scroll
   - Solution: Monitor DevTools, throttle if needed (unlikely for single stroke-width update)

### Implementation order (recommended):
1. Start with Phase 2 (headcount calculation) - independent, can test in isolation
2. Add Phase 1 (config) when values are known
3. Then Phase 3 (timeline rendering) - depends on knowing width values
4. Then Phase 4 (integration) - brings everything together
5. Finally Phases 5-6 (tuning and testing)

---

**Last Updated:** 2025-10-25  
**Next Step:** Review plan with user, then begin Phase 2 implementation (PeopleLaneWidthCalculator)


