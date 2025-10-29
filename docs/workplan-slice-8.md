# Slice 8 Implementation Plan: Dynamic Lane Width Growth (Projects)

**Status:** Ready for Implementation  
**Created:** 2025-10-29  

---

## Summary

Implement dynamic project lane width growth by **generalizing and reusing the existing people lane architecture**. Project lane thickness changes based on cumulative `widthIncrement` values as projects start, mirroring the pattern already implemented for people lane cumulative headcount.

**Key Principle:** Don't reinvent the wheel. The people lane already solves this problem—adapt its pattern for projects.

---

## Context Analysis

✅ **Already in place from Slice 4 (People Lane):**
- `ActiveCountCalculator<T>` - Generic precomputed cumulative count calculator
  - **This is the core reusable pattern!**
  - Already designed to be adapted for projects
  - Precomputes timeline of cumulative values with O(log n) lookups
- `PeopleLanePathGenerator` - Composes calculator with SVG path generation
  - Uses `ActiveCountCalculator<Person>` for headcount
  - Generates variable-width SVG path with Bezier curves
  - Consolidates close-together events for smooth curves
- SVG path rendering with variable width (filled shapes, not strokes)
- Viewport position tracking with continuous updates via `requestAnimationFrame`
- `Timeline` class renders lanes and stores selections

✅ **Configuration & types infrastructure:**
- `LAYOUT.lanes.people.*` configuration in `config.ts`
  - `baseStrokeWidth`, `pixelsPerPerson`, `bezierTension`, etc.
- Type system with `Person`, `Project`, `TimelineData`

✅ **Integration patterns established:**
- Calculator instantiated in `main.ts` with data
- Path generator uses calculator for width calculations
- Timeline renders path with D3

❌ **Not yet implemented (needed for Slice 8):**
- `ProjectLanePathGenerator` class (parallel to `PeopleLanePathGenerator`)
- `ActiveCountCalculator<Project>` instantiation for project width increments
- Project lane configuration in `config.ts`
- Project lane SVG path rendering in `Timeline`
- Integration in `main.ts` to wire up project lane

🎯 **Implementation Strategy:**
1. **Study existing pattern:** Examine `PeopleLanePathGenerator` and how it uses `ActiveCountCalculator`
2. **Adapt calculator:** Instantiate `ActiveCountCalculator<Project>` with project start dates and width increments
3. **Create parallel path generator:** Copy-paste `PeopleLanePathGenerator`, rename to `ProjectLanePathGenerator`, adapt for projects
4. **Mirror configuration:** Add `LAYOUT.lanes.projects.*` parallel to people lane config
5. **Replicate rendering:** Add project path to timeline rendering (same as people path)

---

## Detailed Task Breakdown

### Phase 1: Configuration & Planning
**Status:** Pending  
**🎯 INTEGRATION POINT:** Complete configuration before coding

**Task 1.1: Study existing people lane implementation** ✅ (for implementer)
- Read `active-count-calculator.ts` - understand generic pattern
- Read `people-lane-path-generator.ts` - understand composition pattern
- Read relevant sections of `main.ts` - understand integration pattern
- Identify what's generic vs. what's people-specific
- **Rationale:** Understanding existing code is prerequisite for effective reuse

**Task 1.2: Add project lane width configuration to `config.ts`** 
- Add to `LAYOUT.lanes.projects`:
  ```typescript
  projects: {
    yPosition: 150,
    initialStrokeWidth: 2,
    color: COLORS.projects,
    // NEW: Add these fields (parallel to people lane)
    baseStrokeWidth: 2, // px - minimum width before any projects start
    // Path generation parameters for smooth organic curves
    minEventSpacing: 50, // px - consolidate close-together projects
    bezierTension: 0.4, // 0-1 - horizontal control point offset (same as people)
    bezierVerticalTension: 0.8, // 0-1 - vertical interpolation (same as people)
  }
  ```
- **Note:** Unlike people lane (`pixelsPerPerson: 2`), projects use varying `widthIncrement` from data
- **Rationale:** Centralizes configuration, makes values tunable, mirrors people lane structure

**Task 1.3: Map implementation patterns (mental model)**
- Create explicit mappings:
  - `Person.joined` → `Project.start`
  - `Person.left` → `Project.end` (projects have no end dates for width calculation)
  - `headcount` → `sum of widthIncrements`
  - `pixelsPerPerson` → `project.widthIncrement` (per-project value)
  - `PeopleLanePathGenerator` → `ProjectLanePathGenerator`
- **Rationale:** Clear mappings prevent confusion during adaptation

---

### Phase 2: Adapt ActiveCountCalculator for Project Width Increments
**Status:** Pending  
**🎯 INTEGRATION POINT:** Test calculator separately before path generation

**Task 2.1: Design calculator instantiation strategy**
- **Key difference from people:** Projects don't count (1 per entity), they sum `widthIncrement` values
- **Approach:** Use `ActiveCountCalculator<Project>` but pass `project.widthIncrement` as delta instead of `1`
- **Challenge:** `ActiveCountCalculator` uses fixed +1/-1 deltas for joins/departures
- **Solution:** Modify or extend calculator to accept custom delta values
- **Decision point:** Extend `ActiveCountCalculator` to support custom deltas OR create wrapper
- **Rationale:** Calculator currently hardcodes +1/-1; need configurable increments

**Task 2.2: Extend ActiveCountCalculator to support custom delta values**
- Modify `buildTimeline()` method signature:
  ```typescript
  // OLD: Fixed +1 for starts, -1 for ends
  // NEW: Accept custom delta calculation
  constructor(
    entities: T[],
    getEntityStart: (entity: T) => Date,
    getEntityEnd: (entity: T) => Date | null,
    getStartDelta?: (entity: T) => number, // NEW: default = 1
    getEndDelta?: (entity: T) => number,   // NEW: default = -1
    loggingConfig?: LoggingConfig<T>
  ) { ... }
  ```
- Update `addEvent()` calls to use custom deltas
- **Backward compatibility:** Default to +1/-1 if custom deltas not provided
- **Rationale:** Makes calculator truly generic, supports both counting and summing

**Task 2.3: Instantiate project width calculator in `main.ts`**
- After loading data, create calculator:
  ```typescript
  // Reuse same ActiveCountCalculator pattern, but sum widthIncrements
  const projectWidthCalculator = new ActiveCountCalculator<Project>(
    data.projects,
    (project) => project.start,
    (project) => project.end,
    (project) => project.widthIncrement, // Custom delta: use widthIncrement
    (project) => 0, // End delta not used (null end dates)
    {
      entityName: 'Projects (width)',
      formatDescription: (proj, isStart) => `${proj.name} +${proj.widthIncrement}px`,
    }
  );
  ```
- **Rationale:** Reuses exact same infrastructure as people lane, just different delta source

**Task 2.4: Test calculator with logging**
- Run app and check console output:
  ```
  Projects (width) count timeline: N events
    2021-01-01: 0 → 3 (Platform v1 +3px)
    2021-06-15: 3 → 8 (Mobile App +5px)
    2022-03-01: 8 → 19 (Analytics +11px)
    ...
  ```
- Verify cumulative sums match manual calculation
- Test `getCountAt()` at various dates
- **Rationale:** Validate domain logic before presentation layer

---

### Phase 3: Create ProjectLanePathGenerator (Parallel to People Lane)
**Status:** Pending  
**🎯 INTEGRATION POINT:** Test path generation independently

**Task 3.1: Create `project-lane-path-generator.ts` by adapting people lane**
- **Start with copy-paste:** Copy `people-lane-path-generator.ts` to `project-lane-path-generator.ts`
- **Rename class:** `PeopleLanePathGenerator` → `ProjectLanePathGenerator`
- **Update imports:** Change `Person` type to `Project`, update config references
- **Rationale:** Copy-paste ensures we capture all necessary patterns, then adapt

**Task 3.2: Adapt constructor and width calculation**
- Change constructor parameter type:
  ```typescript
  export class ProjectLanePathGenerator {
    private readonly activeCount: ActiveCountCalculator<Project>; // Changed from Person
    
    constructor(activeCount: ActiveCountCalculator<Project>) {
      this.activeCount = activeCount;
    }
  }
  ```
- Rename methods for clarity:
  - `getHeadcountAt()` → `getCumulativeWidthIncrementAt()` (more descriptive)
  - `getStrokeWidthAt()` calculation:
    ```typescript
    public getStrokeWidthAt(date: Date): number {
      const cumulativeIncrement = this.getCumulativeWidthIncrementAt(date);
      return LAYOUT.lanes.projects.baseStrokeWidth + cumulativeIncrement;
    }
    ```
- **Key difference:** Width formula is `baseWidth + cumulativeIncrement` (not `baseWidth + count * pixelsPerEntity`)
- **Rationale:** Makes code more readable and domain-appropriate

**Task 3.3: Update path generation references**
- In `generateLanePath()` method:
  - Update config references: `LAYOUT.lanes.people.*` → `LAYOUT.lanes.projects.*`
  - Update color references if needed
  - Update comments to reference projects, not people
- Path generation algorithm **stays identical** (already generic)
- **Rationale:** Path algorithm is presentation-layer generic, only domain references change

**Task 3.4: Verify consolidation parameters**
- Projects may have different spacing patterns than people
- Consider adjusting `minEventSpacing` if needed
- Test with real data to see if consolidation threshold is appropriate
- **Rationale:** Projects may cluster differently than people joins, tune for smooth curves

---

### Phase 4: Render Project Lane Path in Timeline
**Status:** Pending  
**🎯 INTEGRATION POINT:** Visual integration - see project lane on screen

**Task 4.1: Study people lane rendering in `timeline.ts`**
- Find where people lane path is rendered
- Identify:
  - How path generator is passed to timeline
  - How `generateLanePath()` is called
  - How path is added to SVG DOM
  - How path is styled (fill color, etc.)
- **Rationale:** Mirror exact same pattern for project lane

**Task 4.2: Pass project path generator to Timeline constructor**
- Update `Timeline` constructor signature:
  ```typescript
  constructor(
    container: HTMLElement,
    data: TimelineData,
    peopleLanePathGenerator: PeopleLanePathGenerator,
    projectLanePathGenerator: ProjectLanePathGenerator // NEW parameter
  ) { ... }
  ```
- Store as private property: `private readonly projectLanePathGenerator`
- **Rationale:** Dependency injection, same pattern as people lane

**Task 4.3: Add project lane path rendering in `renderLanes()` method**
- Find existing people lane path rendering code
- Copy and adapt for projects:
  ```typescript
  // Generate project lane path (parallel to people lane)
  const projectPath = this.projectLanePathGenerator.generateLanePath(
    this.xScale,
    LAYOUT.lanes.projects.yPosition,
    this.startDate,
    this.endDate
  );
  
  // Render project lane as filled path
  lanesGroup
    .append('path')
    .attr('class', 'lane-projects-path')
    .attr('d', projectPath)
    .attr('fill', LAYOUT.lanes.projects.color)
    .attr('opacity', 1);
  ```
- **Placement:** Add after or before people lane rendering (order doesn't matter)
- **Rationale:** Exact same rendering pattern, different data source

**Task 4.4: Update main.ts integration**
- Instantiate project path generator:
  ```typescript
  // After creating projectWidthCalculator (Task 2.3)
  const projectLanePathGenerator = new ProjectLanePathGenerator(projectWidthCalculator);
  ```
- Pass to Timeline constructor:
  ```typescript
  const timeline = new Timeline(
    container,
    data,
    peopleLanePathGenerator,
    projectLanePathGenerator // NEW argument
  );
  ```
- **Rationale:** Completes integration, mirrors people lane wiring

**Task 4.5: Verify initial render**
- Load app and inspect timeline
- **Expected:** Project lane renders as green filled path at top
- **Check:** 
  - Lane starts at 2px width
  - Lane grows as projects start (based on `widthIncrement` values)
  - Smooth Bezier curves between width changes
  - No console errors
- **Rationale:** Visual confirmation before moving to dynamic updates

---

### Phase 5: Testing & Validation
**Status:** Pending

**Task 5.1: Test project lane width growth during scroll**
- Manually scroll through timeline (Space bar, arrows)
- Observe project lane thickness increasing at project start dates
- **Verify specific checkpoints:**
  - At timeline start (before any projects): width = 2px
  - After first project (e.g., Platform v1 with widthIncrement=3): width = 2 + 3 = 5px
  - After second project (e.g., Mobile App with widthIncrement=5): width = 2 + 3 + 5 = 10px
  - After third project (e.g., Analytics with widthIncrement=11): width = 2 + 3 + 5 + 11 = 21px
- Use browser DevTools to measure rendered path width at various positions
- **Rationale:** Validate cumulative width calculation end-to-end

**Task 5.2: Test with keyboard navigation and auto-scroll**
- Test that project lane width updates during:
  - Space bar auto-scroll
  - Right arrow auto-scroll  
  - Manual scroll (if supported)
- **Expected:** Smooth transitions, no jumps
- **Note:** Path is rendered statically (not animated), so width baked into SVG path
- **Rationale:** Ensure works with all interaction modes

**Task 5.3: Compare people lane and project lane visually**
- Both lanes should:
  - Start at 2px width
  - Grow smoothly over time
  - Use similar Bezier curve parameters
  - Have organic, flowing appearance
- **Visual check:** Side-by-side growth should feel balanced
- **Rationale:** Aesthetic consistency between lanes

**Task 5.4: Test edge cases**
- **Timeline start:** Project lane = 2px (no projects yet)
- **Timeline end:** Project lane = 2 + sum(all widthIncrements)
- **Multiple projects same day:** Width increases by sum of increments
- **Very close project starts:** Consolidation smooths curves (no jags)
- **No projects in data:** Lane stays at 2px throughout
- **Rationale:** Catch corner cases that break assumptions

**Task 5.5: Verify logging output**
- Check console for project width timeline log
- **Expected format:**
  ```
  Projects (width) count timeline: N events
    2021-01-01: 0 → 3 (Platform v1 +3px)
    2021-06-15: 3 → 8 (Mobile App +5px)
    ...
  ```
- Verify values match data.json
- **Rationale:** Logging helps debug issues, validates data processing

**Task 5.6: Test with updated data**
- Add more projects to data.json with varying `widthIncrement` values
- Test edge cases:
  - Large increments (e.g., 20px)
  - Small increments (e.g., 1px)
  - Many projects in short time span
- **Rationale:** Ensure pattern scales to realistic data volumes

---

## Success Criteria Checklist

### Core Functionality
- [ ] Project lane starts at 2px width at timeline start
- [ ] Width increases by `project.widthIncrement` each time a project starts
- [ ] Width formula: `strokeWidth = 2 + sum(all started project widthIncrements)`
- [ ] Final width at timeline end = 2 + sum(all project widthIncrements)
- [ ] No visual jumps during scroll (smooth Bezier curves)

### Code Reuse & Architecture
- [ ] `ActiveCountCalculator<Project>` instantiated with custom deltas
- [ ] `ProjectLanePathGenerator` mirrors `PeopleLanePathGenerator` structure
- [ ] Configuration in `LAYOUT.lanes.projects.*` parallel to people lane
- [ ] Rendering in `Timeline` mirrors people lane path rendering
- [ ] Integration in `main.ts` follows people lane pattern

### Technical Quality
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during rendering or scrolling
- [ ] Console logging shows project width timeline with correct values
- [ ] Path rendering uses correct colors (green for projects)
- [ ] SVG path is valid and renders correctly

### Visual Quality
- [ ] Project lane rendered as smooth filled path (not stroke)
- [ ] Bezier curves are organic and flowing (no sharp corners)
- [ ] Width changes are visually noticeable but not jarring
- [ ] Lane color (green) matches spec and other project elements
- [ ] Visual appearance consistent with people lane style

### Integration
- [ ] Works during auto-scroll (Space/Right arrow)
- [ ] Works during manual navigation (if applicable)
- [ ] Doesn't interfere with people lane rendering
- [ ] Doesn't interfere with other timeline features (counters, photos, particles)
- [ ] Timeline loads and renders without errors

---

## Technical Decisions

### 1. Reuse ActiveCountCalculator vs. Create New Calculator
**Decision:** Extend `ActiveCountCalculator` to support custom deltas, then reuse it  
**Rationale:**  
- Calculator pattern is exactly what we need (precomputed cumulative values)
- Only difference is delta values (+widthIncrement instead of +1)
- Extending with optional delta parameters maintains backward compatibility
- Avoids code duplication (400+ lines of tested code)
- Makes calculator truly generic as originally intended

### 2. Copy-paste PeopleLanePathGenerator vs. Abstract Base Class
**Decision:** Copy-paste and adapt (create separate `ProjectLanePathGenerator`)  
**Rationale:**  
- Time constraint (1-2 day project, prototyping phase)
- Code is ~200 lines, manageable duplication
- Domain terminology differs (headcount vs. width increment)
- Future refactoring can extract base class if needed
- Parallel classes easier to understand than abstraction layers
- Matches project philosophy: "Focus on clarity, code can be throwaway"

### 3. Projects Have End Dates in Data, but Don't Use Them for Width
**Decision:** Pass `null` for end date accessor in calculator instantiation  
**Rationale:**  
- Spec is clear: "Width increases when project starts" (no decrease when ends)
- Projects.end exists in data model for other purposes (not width calculation)
- Simpler logic: monotonic increase only
- Calculator supports null end dates (returns no end events)

### 4. Stroke Width Calculation: Fixed Multiplier vs. Per-Project Increment
**Decision:** Use per-project `widthIncrement` field from data  
**Rationale:**  
- Spec explicitly states: "project.widthIncrement field" in data model
- Different projects have different impact (major vs. minor projects)
- Formula: `baseWidth + sum(widthIncrements)` instead of `baseWidth + count * fixedMultiplier`
- More expressive than fixed multiplier (allows visual weighting)

### 5. Path Consolidation Parameters: Reuse People Lane Values vs. Tune Separately
**Decision:** Start with same values, tune separately if needed  
**Rationale:**  
- Visual consistency between lanes is desirable
- Projects may have different temporal distribution than people
- Easy to adjust `minEventSpacing` if curves look jagged
- Start with proven values, iterate based on visual results

### 6. When to Extend Calculator vs. When to Create Adapter
**Decision:** Extend calculator with optional parameters (backward compatible)  
**Rationale:**  
- Minimal API changes (add optional parameters with defaults)
- No breaking changes to existing people lane code
- More maintainable than wrapper/adapter pattern
- Calculator becomes more reusable for future use cases

### 7. Project Lane Rendering: Stroke vs. Fill
**Decision:** Use filled path (same as people lane)  
**Rationale:**  
- Consistency with people lane implementation
- Allows variable width within single path
- Smooth Bezier curves for organic appearance
- Better visual quality than stroke (no aliasing issues at width changes)

---

## Estimated Complexity

### Development Time Estimates:

- **Phase 1 (Configuration & Planning):** ~20-30 minutes
  - Study existing code: 10-15 min
  - Add configuration: 5-10 min
  - Mental mapping: 5 min

- **Phase 2 (Adapt Calculator):** ~30-40 minutes ⭐ (Most complex)
  - Design strategy: 10 min
  - Extend calculator with custom deltas: 15-20 min
  - Instantiate in main.ts: 5 min
  - Test with logging: 5-10 min

- **Phase 3 (Create ProjectLanePathGenerator):** ~25-35 minutes
  - Copy-paste and rename: 5 min
  - Adapt constructor & width calc: 10-15 min
  - Update path generation references: 5-10 min
  - Verify consolidation: 5 min

- **Phase 4 (Render in Timeline):** ~25-35 minutes
  - Study people lane rendering: 10 min
  - Update Timeline constructor: 5 min
  - Add rendering code: 5-10 min
  - Wire up in main.ts: 5 min
  - Verify initial render: 5-10 min

- **Phase 5 (Testing & Validation):** ~30-40 minutes
  - Test width growth: 10-15 min
  - Test interactions: 5-10 min
  - Visual comparison: 5 min
  - Edge cases: 10-15 min

**Total Estimated Time:** ~2-3 hours

**Complexity Assessment:**
- **Medium complexity:** Extending ActiveCountCalculator with custom deltas
- **Low-medium complexity:** Adapting PeopleLanePathGenerator (mostly copy-paste)
- **Low complexity:** Configuration, integration, testing
- **Overall:** Much faster than building from scratch due to reuse

**Risk Areas:**
- Custom delta extension might have subtle bugs (need thorough testing)
- Path generation may need different consolidation parameters
- Integration might reveal unexpected dependencies

**Confidence Level:** High - pattern is proven, just adapting parameters

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-001:** Three-Lane Layout - project lane width specification
  - "Top Lane (Projects): Green (#7ED321), starts at 2px stroke width, grows with projects"

### User Stories:
- **US-003:** Growth Visualization - acceptance criteria for project width growth
  - "Project lane starts at 2px stroke width"
  - "Project lane increases by N px for each project starting (N specified in project.widthIncrement field)"

### Data Model:
- **Section 3.1:** Input JSON Schema - projects array with `start` date and `widthIncrement` field
  ```json
  {
    "id": "proj1",
    "name": "Platform v1",
    "start": "2021-01-01",
    "end": null,
    "widthIncrement": 3
  }
  ```

- **Section 3.2:** Derived State - `projectStrokeWidth` as computed property
  - Formula: `2 + sum(widthIncrements for all started projects)`

### UI Specifications:
- **Section 4.4:** Animation Timings - lane width growth: 0.3s ease-out
  - **Note:** This was for dynamic stroke-width transitions in original spec
  - Current implementation uses static path rendering (width baked into SVG)
  - No additional animation implementation needed

### Prompt Slice 8:
- "Precompute cumulative width at each project start date"
- "Create function to calculate stroke width at any timestamp"
- "Formula: `strokeWidth = 2 + cumulativeWidthIncrement`"
- "Reuse the cumulative calculation pattern from Slice 4 (people lane)"
- **Emphasis:** "Generalize and reuse as much as possible the existing code and logic for the people lane"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slice 4 complete (people lane with `ActiveCountCalculator` and `PeopleLanePathGenerator`)
- ✅ Timeline rendering infrastructure
- ✅ D3 scale and SVG path rendering
- ✅ Project data with `start` dates and `widthIncrement` fields
- ✅ Configuration system in `config.ts`

**No new dependencies needed:**
- All infrastructure exists from people lane implementation
- No new libraries or tools required

**Key files to understand before starting:**
- `src/active-count-calculator.ts` - Generic calculator pattern
- `src/people-lane-path-generator.ts` - Path generation pattern
- `src/timeline.ts` - Lane rendering
- `src/main.ts` - Integration and wiring
- `src/config.ts` - Configuration structure

---

## Implementation Notes

### Code organization:
```
src/
├── active-count-calculator.ts         # (Modified) Add custom delta parameters
├── people-lane-path-generator.ts      # (Unchanged) Reference implementation
├── project-lane-path-generator.ts     # (New) Adapted from people lane
├── timeline.ts                        # (Modified) Add project path rendering
├── main.ts                            # (Modified) Wire up project calculator & generator
├── config.ts                          # (Modified) Add project lane path config
└── types.ts                           # (Unchanged) Project type already exists
```

### Key classes/methods to create/modify:

**In active-count-calculator.ts (extend):**
```typescript
export class ActiveCountCalculator<T> {
  constructor(
    entities: T[],
    getEntityStart: (entity: T) => Date,
    getEntityEnd: (entity: T) => Date | null,
    getStartDelta?: (entity: T) => number, // NEW: default = 1
    getEndDelta?: (entity: T) => number,   // NEW: default = -1
    loggingConfig?: LoggingConfig<T>
  ) { ... }
}
```

**In project-lane-path-generator.ts (new):**
```typescript
export class ProjectLanePathGenerator {
  private readonly activeCount: ActiveCountCalculator<Project>;
  
  constructor(activeCount: ActiveCountCalculator<Project>) { ... }
  
  public getCumulativeWidthIncrementAt(date: Date): number { ... }
  public getStrokeWidthAt(date: Date): number { ... }
  public generateLanePath(
    xScale: d3.ScaleTime<number, number>,
    centerY: number,
    timelineStart: Date,
    timelineEnd: Date
  ): string { ... }
  
  // Private methods: consolidateClosePoints(), buildSmoothPath() - same as people
}
```

**In main.ts (wire up):**
```typescript
// Create project width calculator
const projectWidthCalculator = new ActiveCountCalculator<Project>(
  data.projects,
  (project) => project.start,
  (project) => null,
  (project) => project.widthIncrement,
  (project) => 0,
  { entityName: 'Projects (width)', formatDescription: ... }
);

// Create project path generator
const projectLanePathGenerator = new ProjectLanePathGenerator(projectWidthCalculator);

// Pass to Timeline constructor
const timeline = new Timeline(
  container,
  data,
  peopleLanePathGenerator,
  projectLanePathGenerator
);
```

### Potential gotchas:

1. **Custom delta defaults:** Ensure default behavior preserves existing people lane functionality
   - Solution: Use default parameter values `getStartDelta = (e) => 1`

2. **Type inference with optional functions:** TypeScript may struggle with generic function parameters
   - Solution: Explicitly type optional delta functions or use conditional types

3. **Project end dates:** Data has `end` field but we don't use it for width
   - Solution: Pass `(project) => null` for end date accessor

4. **Zero width increments:** What if `widthIncrement = 0`?
   - Solution: Calculator handles it naturally (adds 0 to cumulative sum)

5. **Negative width increments:** Should projects be allowed to decrease width?
   - Solution: Data validation if needed, or trust data (prototype phase)

6. **Path consolidation with large increments:** Big jumps might look abrupt even with consolidation
   - Solution: Tune `minEventSpacing` or `bezierTension` if needed

7. **Logging format confusion:** Calculator logs "count" but we're summing increments
   - Solution: Use descriptive `entityName` in logging config ("Projects (width)")

8. **Missing widthIncrement field:** Data might be missing field
   - Solution: TypeScript types enforce it, but add runtime validation if needed

---

## Implementation Order (Recommended)

1. **Phase 1 (Configuration)** - Establishes foundation
2. **Phase 2 (Calculator)** - Core domain logic, testable independently
   - ⭐ **CHECKPOINT:** Validate calculator output before proceeding
3. **Phase 3 (Path Generator)** - Presentation layer, testable independently
4. **Phase 4 (Timeline Integration)** - Brings everything together
   - ⭐ **CHECKPOINT:** Visual confirmation of project lane
5. **Phase 5 (Testing)** - Comprehensive validation

**Incremental integration:** Each phase builds on previous, enables frequent testing

---

## Open Questions

1. **Should we add project end date handling for width?**
   - **Answer:** No - spec says width increases at start, no decrease at end
   - Projects.end is for other features, not width calculation

2. **What if a project has widthIncrement = 0?**
   - **Answer:** Valid - some projects may not impact visual width (administrative projects)
   - Calculator handles it naturally (adds 0)

3. **Should we validate widthIncrement ranges (e.g., 1-20px)?**
   - **Answer:** For prototype, trust data. Add validation if needed later.

4. **Different consolidation parameters for projects vs. people?**
   - **Answer:** Start with same values, adjust if visual quality differs

5. **Should calculator log cumulative sums or individual increments?**
   - **Answer:** Log both (current implementation logs previous → new)

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-10-29  
**Next Step:** Begin Phase 1 - study existing code and add configuration

