You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 1 - Static Three-Lane Foundation

**Goal:** Render basic timeline structure with real data from JSON file.

**What to build:**
1. Set up Vite project with TypeScript and D3.js v7
2. Load and parse `data.json` (use the schema from Section 3.1 of the spec)
3. Render SVG with:
   - Three horizontal lanes at y-positions: 150px (projects/green), 400px (events/orange), 650px (people/blue)
   - Initial stroke widths: 2px (projects), 8px (events), 2px (people)
   - Vertical gridlines at year boundaries with year labels below
   - Timeline width = numYears × 400px
   - Viewport: 1200×800px with horizontal scroll capability

**Expected output:** 
Open browser → see three colored horizontal lines spanning the full timeline with vertical year gridlines. Timeline should be scrollable.

**Success criteria:**
- All three lanes visible in correct colors (#7ED321, #F5A623, #4A90E2)
- Lanes span from startYear to endYear
- Vertical gridlines appear at each year boundary
- Manual scrollbar works to view full timeline

**Reference sections in spec:**
- Section 3.1 (Data Model)
- Section 4.1 (Layout & Dimensions)
- Section 4.2 (Color Palette)
- FR-001 (Three-Lane Layout)

Use modern, clean TypeScript. Target Chrome 140 only. This is prototype code.