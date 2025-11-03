You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 2 - Event Markers with Basic Data Binding

**Goal:** Show all events as vertical markers at correct positions on the timeline.

**What to build:**
1. Load events from `data.json` and sort by date.
2. Map each event to its x-position using D3 time scale
3. Render on middle lane (events lane):
   - Vertical line extending upward 30px from the lane
   - Line width: 3px, color: #F5A623 (orange)
   - Text label at top of line with event name
   - Visual distinction for key events (isKeyMoment=true) - use bold or larger font
   - Use ONLY events for this, not people or projects!
4. Handle text overflow/truncation if labels are too long

**Expected output:**
Timeline now shows orange vertical tick marks at each event date with readable labels above them. Key events should be visually distinguishable.

**Success criteria:**
- All events from data.json appear as vertical lines at correct x-positions
- Event names are readable as text labels
- Key events (isKeyMoment=true) are visually distinct from regular events
- No overlapping/collision of closely-spaced event labels (basic handling)

**Reference sections in spec:**
- Section 3.1 (Data Model - events array)
- Section 4.1 (Layout & Dimensions)
- FR-003 (Event Markers)
- US-002 acceptance criteria (for understanding key events)

Use D3 data binding for efficient rendering. This builds on Slice 1's foundation.