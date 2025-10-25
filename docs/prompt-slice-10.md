You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 10 - Departure Curves (People Leaving)

**Goal:** Downward-branching curves appear when people leave the organization.

**What to build:**
1. Detect when auto-scroll crosses a person departure date:
   - Track last processed x-position
   - Check if any person.left dates fall between last and current position
   - Filter out people where left=null (still active)
2. Render departure curve for each departure:
   - Small blue line (2px stroke width)
   - Start at people lane, branch downward 40px
   - Use quadratic bezier curve for gentle arc
   - Control point: offset 20px horizontally and 30px vertically for natural curve
3. Animate curve appearance:
   - Fade in curve (opacity 0 → 1 over 0.1s)
   - Then fade to 30% opacity over 0.4s (ease-out)
   - Curve remains visible at 30% opacity (does not disappear)
4. Synchronize with lane width:
   - Trigger people lane width decrement by 1px when departure occurs

**Expected output:**
During auto-scroll, when timeline reaches a person departure date, a small blue curve branches downward from the people lane and fades to 30% opacity. The people lane shrinks by 1px.

**Success criteria:**
- Blue curve appears at correct x-position when departure date reached
- Curve uses gentle quadratic bezier (not straight line)
- Branches downward 40px from people lane
- Fades to 30% opacity over 0.4s and remains visible
- People lane width decreases by 1px after departure
- Multiple curves can appear if departures are close together
- Curves remain visible throughout rest of timeline

**Reference sections in spec:**
- Section 3.1 (Data Model - people array with left dates)
- Section 4.4 (Animation Timings - departure fade: 0.4s ease-out)
- FR-006 (Departure Indicators)
- US-003 (Note about departures in original spec context)

Tip: Use SVG path element with quadratic bezier curve (Q command). Calculate control point to create natural downward arc. Store curve elements so they persist after fading. This builds on Slice 6's event detection system.