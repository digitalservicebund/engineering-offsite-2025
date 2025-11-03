# Slice 2 Implementation Plan: Event Markers with Basic Data Binding

**Status:** In Progress  
**Started:** 2025-10-25

---

## Context Analysis

✅ **Already in place from Slice 1:**
- Timeline SVG container
- D3 time scale (`xScale`) for date-to-position mapping
- Three lanes rendered (projects, events, people)
- Data loading working with 6 events in `data.json`

---

## Detailed Task Breakdown

### Phase 1: Configuration & Setup ✅
**Status:** Complete

1. **Add event marker configuration to `config.ts`**
   - Event marker dimensions (height: 30px, width: 3px)
   - Event label font settings (11px, sans-serif)
   - Key moment styling (bold weight or larger font size)
   - Text label positioning offsets
   - Text truncation settings (max width before truncation)

### Phase 2: Data Preparation ✅
**Status:** Complete

2. **Sort events by date in Timeline constructor**
   - Parse event date strings to Date objects
   - Sort events array chronologically
   - Store sorted events for rendering
   - Load events only, not people or projects (yet)

### Phase 3: Event Marker Rendering

3. **Create `renderEventMarkers()` private method in Timeline class**
   - Create SVG group for event markers
   - Use D3 data binding with `this.data.events`
   - Map each event to x-position using existing `xScale`

4. **Render vertical marker lines**
   - SVG `<line>` elements extending upward 30px from events lane
   - Line attributes:
     - x-position from `xScale(eventDate)`
     - y-start: `LAYOUT.lanes.events.yPosition`
     - y-end: `LAYOUT.lanes.events.yPosition - 30`
     - stroke: `#F5A623` (orange)
     - stroke-width: `3px`

5. **Render event name labels**
   - SVG `<text>` elements positioned at top of each marker line
   - Position: above the marker line (y = marker top)
   - Text anchor: middle (centered on marker)
   - Font: 11px, sans-serif
   - Color: `LAYOUT.textColor` (#2C3E50)

6. **Apply visual distinction for key events**
   - Conditional styling based on `event.isKeyMoment`
   - For key moments:
     - Font weight: bold (600 or 700)
     - OR font size: 13px instead of 11px
   - Add comment documenting semantic meaning: "Key moments use bold text to draw presenter's attention during auto-scroll"

### Phase 4: Text Overflow Handling
**Status:** Pending

7. **Implement text truncation for long labels**
   - Calculate text width using D3's `getBBox()` or approximate based on character count
   - Truncate text if exceeds max width (e.g., 80-100px)
   - Append "..." ellipsis for truncated labels
   - Store full text as title attribute for hover tooltip

8. **Basic collision detection (optional, time-permitting)**
   - Detect when events are closer than minimum spacing (e.g., 100px)
   - Alternate label positions (above/below marker or staggered vertically)
   - OR apply simple rotation to overlapping labels

### Phase 5: Integration & Testing
**Status:** Pending

9. **Call `renderEventMarkers()` from main `render()` method**
   - Add after `renderLanes()` to ensure markers appear on top

10. **Verify rendering with test data**
    - Check all 6 events from `data.json` appear
    - Verify x-positions are correctly mapped
    - Confirm key events (evt2, evt3, evt4, evt6) are visually distinct
    - Test with closely-spaced events if needed

11. **Add console logging for debugging**
    - Log number of events rendered
    - Log any events with missing/invalid dates

---

## Success Criteria Checklist

- [ ] All 6 events from `data.json` render as orange vertical markers
- [ ] Event markers positioned at correct x-coordinates based on dates
- [ ] Event names appear as text labels above markers
- [ ] Key moments (`isKeyMoment: true`) are visually distinct (bold or larger font)
- [ ] Long event names are truncated with ellipsis
- [ ] Hover shows full event name for truncated labels
- [ ] No TypeScript errors or `any` types
- [ ] Code follows D3 data binding patterns (not imperative loops)

---

## Technical Decisions

### 1. Key moment distinction
**Decision:** Bold font weight (700)  
**Rationale:** More subtle than larger font size, better for prototype clarity. Keeps vertical alignment consistent.

### 2. Text truncation threshold
**Decision:** 100px max width OR 20 characters, whichever is more restrictive  
**Rationale:** Pixel measurement is more accurate, character count is fallback for performance.

### 3. Collision handling approach
**Decision:** Start with simple approach - skip complex collision detection for initial implementation  
**Rationale:** Focus on core functionality first. Can add staggered positioning if testing reveals issues with sample data.

---

## Estimated Complexity

- **Core implementation (tasks 1-6, 9):** ~30-45 minutes
- **Text handling (tasks 7-8):** ~15-20 minutes  
- **Testing & refinement (tasks 10-11):** ~15-20 minutes
- **Total:** ~1-1.5 hours

---

## Reference Sections in Spec

- Section 3.1 (Data Model - events array)
- Section 4.1 (Layout & Dimensions)
- FR-003 (Event Markers)
- US-002 acceptance criteria (for understanding key events)

---

**Last Updated:** 2025-10-25

