You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 8 - Dynamic Lane Width Growth (Projects)

**Goal:** Project lane thickness changes based on cumulative widthIncrement at viewport position.

**IMPORTANT:** This slice is architecturally parallel to Slice 4 (People Lane). **Generalize and reuse the existing people lane code as much as possible.** The logic is identical except for:
- People lane: counts cumulative individuals (start/end events)
- Project lane: sums cumulative widthIncrement values (start events only)

**Implementation approach:**
1. **Examine the people lane implementation:**
   - Look at how the people lane calculates cumulative counts
   - Study the viewport update mechanism that changes stroke width
   - Review the transition animation applied during scrolling

2. **Generalize the existing pattern:**
   - Extract/reuse the cumulative calculation logic
   - Adapt to sum `widthIncrement` instead of counting people
   - Use the same viewport-to-date-to-width update flow
   - Apply identical D3 transitions (0.3s ease-out)

3. **Specific parallel mappings:**
   - People events → Project start events
   - Count of active people → Sum of widthIncrements for started projects
   - Base width: 2px (same for both lanes)
   - Viewport position → current date lookup (same mechanism)
   - Stroke-width update with transition (same animation pattern)

**What to build:**
1. Precompute cumulative width at each project start date (parallel to people lane cumulative count):
   - Start at 0
   - Add project.widthIncrement for each project start
   - Build sorted array of cumulative sums
2. Create function to calculate stroke width at any timestamp (reuse people lane pattern):
   - Base width: 2px
   - Add sum of widthIncrements for all started projects
   - Formula: `strokeWidth = 2 + cumulativeWidthIncrement`
3. Update project lane stroke-width as timeline scrolls (mirror people lane updates):
   - Use viewport center position to determine current date
   - Lookup cumulative width increment at that date
   - Apply stroke-width with smooth D3 transition (0.3s ease-out)
4. Hook into existing viewport controller (same integration point as people lane)

**Expected output:**
As you scroll through the timeline, the project (green) lane grows thicker in steps. Each project adds its widthIncrement value (e.g., 2px → 5px → 11px → 14px).

**Success criteria:**
- Project lane starts at 2px width at timeline start
- Width increases by project.widthIncrement each time a project starts
- Smooth transition when scrolling (no jumps)
- Final width = 2 + sum(all project widthIncrements)
- Works during both manual scroll and auto-scroll
- **Code architecture mirrors people lane implementation**

**Reference sections in spec:**
- Section 3.1 (Data Model - projects array with start date and widthIncrement)
- Section 3.2 (Derived State - projectStrokeWidth)
- Section 4.4 (Animation Timings - lane width growth: 0.3s ease-out)
- FR-001 (Three-Lane Layout - project lane width specification)
- US-003 (Acceptance criteria for project width growth)

**Key principle:** Don't reinvent the wheel. The people lane already solves this problem—adapt its pattern for projects.