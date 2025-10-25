You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 8 - Dynamic Lane Width Growth (Projects)

**Goal:** Project lane thickness changes based on cumulative widthIncrement at viewport position.

**What to build:**
1. Precompute cumulative width at each project start date:
   - Start at 0
   - Add project.widthIncrement for each project start
   - Build sorted array of cumulative sums
2. Create function to calculate stroke width at any timestamp:
   - Base width: 2px
   - Add sum of widthIncrements for all started projects
   - Formula: `strokeWidth = 2 + cumulativeWidthIncrement`
3. Update project lane stroke-width as timeline scrolls:
   - Use viewport center position to determine current date
   - Lookup cumulative width increment at that date
   - Apply stroke-width with smooth D3 transition (0.3s ease-out)
4. Ensure width updates when using keyboard navigation and auto-scroll

**Expected output:**
As you scroll through the timeline, the project (green) lane grows thicker in steps. Each project adds its widthIncrement value (e.g., 2px → 5px → 11px → 14px).

**Success criteria:**
- Project lane starts at 2px width at timeline start
- Width increases by project.widthIncrement each time a project starts
- Smooth transition when scrolling (no jumps)
- Final width = 2 + sum(all project widthIncrements)
- Works during both manual scroll and auto-scroll

**Reference sections in spec:**
- Section 3.1 (Data Model - projects array with start date and widthIncrement)
- Section 3.2 (Derived State - projectStrokeWidth)
- Section 4.4 (Animation Timings - lane width growth: 0.3s ease-out)
- FR-001 (Three-Lane Layout - project lane width specification)
- US-003 (Acceptance criteria for project width growth)

Tip: Reuse the cumulative calculation pattern from Slice 4 (people lane), but sum widthIncrement values instead of counting individuals. This is parallel to Slice 4's implementation.