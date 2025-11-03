You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 4 - Dynamic Lane Width Growth (People Only)

**Goal:** People lane thickness changes based on cumulative headcount at viewport position.

**What to build:**
1. Precompute cumulative headcount at each significant date:
   - Start at 0
   - +1 for each person join
   - -1 for each person departure
2. Create function to calculate stroke width at any timestamp:
   - Base width: 2px
   - Add 1px per person currently active
   - Formula: `strokeWidth = 2 + activeHeadcount`
3. Update people lane stroke-width as timeline scrolls:
   - Use viewport center position to determine current date
   - Lookup cumulative headcount at that date
   - Apply stroke-width with smooth D3 transition (0.3s ease-out)
4. Ensure width updates when using keyboard navigation from Slice 3

**Expected output:**
As you scroll through the timeline, the people (blue) lane visibly grows thicker from left to right. Starting at 2px, it progressively thickens to reflect team size (e.g., 2px → 15px → 62px).

**Success criteria:**
- People lane starts at 2px width at timeline start
- Width increases by 1px for each person join
- Width decreases by 1px for each person departure
- Smooth transition when scrolling (no jumps)
- Final width = 2 + (total joins - total departures)

**Reference sections in spec:**
- Section 3.1 (Data Model - people array with joined/left dates)
- Section 3.2 (Derived State - peopleStrokeWidth)
- Section 4.4 (Animation Timings - lane width growth: 0.3s ease-out)
- FR-001 (Three-Lane Layout - people lane width specification)
- US-003 (Acceptance criteria for width growth)

Tip: Build a sorted timeline array with all join/departure events and their cumulative counts for efficient lookup. This builds on Slice 3's scroll functionality.