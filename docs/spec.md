# Functional Specification: Interactive Engineering Timeline Visualization

**Version:** 1.1  
**Date:** 2025-10-24  
**Effort Estimate:** 1-2 days  
**Purpose:** Presentation prototype for engineering offsite (~60 attendees)

---

## 1. Overview

### 1.1 Product Summary
An interactive, browser-based timeline visualization showing 5 years of engineering organization growth. The system presents people joins/departures, project launches, and milestone events through three color-coded horizontal lanes with smooth animations and photo-driven narrative beats.

### 1.2 Success Criteria
- Presenter can start/stop auto-scroll through timeline
- Timeline pauses automatically at key events
- 12-15 key photo moments create emotional engagement
- Visual clearly shows team growth from 0 to ~60 engineers
- Runs offline in Chrome 140 on presenter's laptop
- Prototype completed and presentation-ready in 1-2 days

### 1.3 Audience & Context
- **Primary user:** Single presenter driving slideshow-style presentation
- **Viewers:** ~60 engineers at offsite
- **Usage:** One-time presentation (throwaway code acceptable)
- **Environment:** Chrome 140 on presenter's laptop, offline capable

---

## 2. Functional Requirements

### 2.1 Core User Stories

**US-001: Timeline Auto-Scroll**
```
As a presenter
I want to start an auto-scrolling timeline that pauses at key events
So that I can control narrative pacing during the presentation

Acceptance Criteria:
- Space bar, right arrow, or click starts continuous auto-scroll
- Timeline scrolls at fixed speed (200 pixels/second)
- Auto-scroll pauses automatically when reaching any event with isKeyMoment=true
- While paused, pressing space/right arrow/click resumes auto-scroll
- Left arrow reverses scroll direction at same speed
- Pressing space while scrolling toggles pause/resume
```

**US-002: Photo Moments**
```
As a presenter
I want key events to display large photos
So that the audience connects emotionally with milestones

Acceptance Criteria:
- When auto-scroll reaches event with hasPhoto=true, photo fades in over 0.3s
- Photo occupies 60-70% of screen
- Photo displays until next keypress
- Photo fades to thumbnail (150x150px) anchored at event marker
- Caption displays below photo during full-screen view
- 12-15 designated photo moments throughout timeline
```

**US-003: Growth Visualization with Join Animations**
```
As a viewer
I want to see the team and projects growing over time with visual join indicators
So that I understand the organization's evolution

Acceptance Criteria:
- People lane starts at 2px stroke width
- People lane increases by 1px for each person joining
- People lane decreases by 1px for each person leaving
- Project lane starts at 2px stroke width
- Project lane increases by N px for each project starting (N specified in project.widthIncrement field)
- When person joins: blue particle (8px circle) animates from below into people lane over 0.5s
- Particle displays person's name as text label during animation
- Particle and label disappear after merging into lane
- When project starts: green particle (8px circle) animates from above into project lane over 0.5s
- Particle displays project name as text label during animation
- Counter displays increment smoothly (e.g., "Engineers: 5 → 12")
```

### 2.2 Detailed Functional Requirements

#### FR-001: Three-Lane Layout and Initial State
- **Top Lane (Projects):** Green (#7ED321), starts at 2px stroke width, grows with projects
- **Middle Lane (Events):** Orange (#F5A623), fixed 8px stroke width
- **Bottom Lane (People):** Blue (#4A90E2), starts at 2px stroke width, grows with people

**Initial State:**
- All three lanes visible from start
- Top lane (projects) remains 2px until first project starts
- Bottom lane (people) remains 2px until first person joins
- Middle lane (events) is always 8px

**Layout:**
- All lanes span full timeline width
- Vertical spacing: 150px between lanes
- Vertical year gridlines every 20% of timeline width (e.g., at 2020, 2021, 2022...)
- Gridlines extend from top to bottom of canvas

#### FR-002: Particle Join Animations
- When person joins: blue circle (8px radius) animates from below into people lane
  - Start position: 60px below lane
  - Duration: 0.5s ease-out
  - Text label with person's name positioned 15px to the right of circle
  - Circle and label move together
  - Both dissolve (opacity 1 → 0) after reaching lane
- When project starts: green circle (8px radius) animates from above into project lane
  - Start position: 60px above lane
  - Duration: 0.5s ease-out
  - Text label with project name positioned 15px to the right of circle
  - Circle and label move together
  - Both dissolve (opacity 1 → 0) after reaching lane

#### FR-003: Event Markers
- Events display as short vertical lines (30px height, 3px width) extending upward from middle lane
- Color: orange (#F5A623)
- Text label with event name positioned at top of vertical line
- Font: 11px, sans-serif
- Events with hasPhoto=true show photo thumbnail (150x150px) anchored at top of vertical line after photo fade-out
- Hover shows full event name if text is truncated

#### FR-004: Camera/Viewport Control
- Viewport width: 1200px (or 100vw if smaller)
- Viewport height: 800px (or 100vh if smaller)
- Timeline scrolls horizontally within fixed viewport
- Auto-scroll speed: 200 pixels/second (constant speed, not constant duration)
- Timeline width calculated: `numYears * 400px` (e.g., 5 years = 2000px)
- Scroll uses smooth translate transform

#### FR-005: Counters & Metrics
- Display in top-right corner (fixed position)
- Three counters: "Engineers: X" | "Projects: Y" | "Year: YYYY"
- Counters animate via counting effect when values change
- Font: sans-serif, 18px, medium weight

#### FR-006: Departure Indicators
- When person leaves: small blue line (2px width) branches downward 40px
- Curve uses quadratic bezier (gentle arc)
- Fades out over 0.4s (opacity 1 → 0.3)
- People lane stroke width decreases by 1px

---

## 3. Data Model

### 3.1 Input JSON Schema

```json
{
  "startYear": 2020,
  "endYear": 2024,
  "people": [
    {
      "id": "p1",
      "name": "Johann Teig",
      "joined": "2020-03-01",
      "left": null
    },
    {
      "id": "p2",
      "name": "Nora Nichtig", 
      "joined": "2021-06-15",
      "left": "2024-02-01"
    }
  ],
  "projects": [
    {
      "id": "proj1",
      "name": "Platform v1",
      "start": "2021-01-01",
      "end": null,
      "widthIncrement": 3
    }
  ],
  "events": [
    {
      "id": "evt1",
      "date": "2021-09-15",
      "name": "First Games Night",
      "isKeyMoment": false,
      "hasPhoto": false,
      "photoUrl": null,
      "caption": null
    },
    {
      "id": "evt2", 
      "date": "2021-10-15",
      "name": "First Team Offsite",
      "isKeyMoment": true,
      "hasPhoto": true,
      "photoUrl": "assets/offsite-2021.jpg",
      "caption": "12 engineers gathered in Portland"
    }
  ]
}
```

### 3.2 Derived State (Computed at Runtime)

**Timeline Points Array:**
```javascript
[
  {
    timestamp: Date,
    xPosition: number,
    engineerCount: number,
    projectCount: number,
    peopleStrokeWidth: number,
    projectStrokeWidth: number,
    peopleJoins: Person[],
    peopleDepartures: Person[],
    projectStarts: Project[],
    event: Event | null
  }
]
```

**Compute at load time:**
- Sort all items by date
- Calculate cumulative counts at each event
- Calculate cumulative stroke widths for people and project lanes
- Pre-calculate particle animation coordinates

---

## 4. UI Specifications

### 4.1 Layout & Dimensions

```
┌─────────────────────────────────────────────────────────────┐
│  Counters (fixed top-right)                                 │
│  Engineers: 23  Projects: 8  Year: 2023                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│      ↓particle + name                                       │
│  ═══●═══════●════ (Projects - Green - 2px → 14px)           │
│                                                             │
│  ─────────┃─────────────┃ (Events - Orange - 8px)           │
│           │event name   │                                   │
│                                                             │
│  ═══●═════════●══════╲   (People - Blue - 2px → 62px)       │
│      ↑particle + name ╲departure                            │
│                                                             │
│  │    │    │    │    │                                      │
│  2020 2021 2022 2023 2024 (vertical gridlines)              │
└─────────────────────────────────────────────────────────────┘

Viewport: 1200 x 800px
Timeline: (years × 400px) wide
Lane vertical positions: 150px, 400px, 650px
Auto-scroll: 200px/second
```

### 4.2 Color Palette

| Element | Color | Usage |
|---------|-------|-------|
| Projects Lane | `#7ED321` | Stroke |
| Events Lane | `#F5A623` | Stroke + markers |
| People Lane | `#4A90E2` | Stroke |
| Background | `#F8F9FA` | Canvas |
| Text | `#2C3E50` | Labels, counters |
| Gridlines | `#E0E0E0` | Year markers |

### 4.3 Typography

- **Counters:** Inter/System, 18px, 500 weight
- **Year labels:** Inter/System, 14px, 400 weight
- **Event labels:** Inter/System, 11px, 400 weight
- **Particle labels:** Inter/System, 11px, 400 weight
- **Photo captions:** Inter/System, 24px, 300 weight, white with dark overlay

### 4.4 Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Auto-scroll | 200px/sec | linear |
| Particle join | 0.5s | ease-out |
| Photo fade-in | 0.3s | ease-in |
| Photo fade-out | 0.3s | ease-out |
| Counter increment | 0.6s | ease-out |
| Departure fade | 0.4s | ease-out |
| Lane width growth | 0.3s | ease-out |

---

## 5. Interaction Flows

### 5.1 Initial Load Sequence

```
1. Parse JSON data file
2. Validate schema (check required fields)
3. Sort all items chronologically
4. Compute timeline points with cumulative widths
5. Render initial frame:
   - All three lanes visible at 2px width (projects/people) or 8px (events)
   - Year gridlines visible
   - First year visible in viewport
6. Display "Press Space to Begin" overlay
7. Wait for user input
```

### 5.2 Standard Auto-Scroll Flow

```
User presses Space/Right Arrow/Click
  ↓
IF currently showing full-screen photo
  → Fade photo to thumbnail position (0.3s)
  → Resume auto-scroll
  
Start continuous auto-scroll at 200px/second
  ↓
WHILE scrolling:
  → Update camera position continuously
  → As items enter viewport:
    - Show particle animations for joins/starts
    - Grow lane widths smoothly
    - Draw departure curves if any
    - Increment counters
  → Monitor for key events (isKeyMoment=true)
  
WHEN reaching event with isKeyMoment=true
  ↓
Pause auto-scroll at event position
  ↓
IF event has hasPhoto=true
  → Fade in full-screen photo (0.3s)
  → Display caption overlay
  → Auto-resume after 2.5s OR wait for keypress
ELSE
  → Highlight event marker
  → Wait for keypress to resume

User presses Space/Right Arrow/Click again
  → Resume auto-scroll from current position
```

### 5.3 Pause/Resume Flow

```
WHILE auto-scrolling:
  User presses Space
    ↓
  Pause auto-scroll at current position
  Wait for input
    ↓
  User presses Space again
    ↓
  Resume auto-scroll at 200px/second
```

### 5.4 Reverse Scroll Flow

```
User presses Left Arrow
  ↓
IF currently scrolling forward
  → Reverse direction, scroll backward at 200px/second
ELSE IF paused
  → Start scrolling backward at 200px/second
  
Auto-scroll stops at previous key event (isKeyMoment=true)
```

---

## 6. Technical Implementation

### 6.1 Technology Stack

**Required:**
- HTML5 + CSS3
- TypeScript (strict mode)
- D3.js v7 (for path generation, transitions, scales)
- Vite (dev server + build)

**Prohibited:**
- No frameworks (React/Vue/etc)
- No canvas rendering
- No localStorage/sessionStorage
- No external API calls

### 6.2 File Structure

```
project/
├── index.html
├── src/
│   ├── main.ts                 # Entry point
│   ├── timeline.ts             # Core timeline class
│   ├── data-loader.ts          # JSON parsing & validation
│   └── types.ts                # TypeScript interfaces
├── assets/
│   ├── data.json               # Timeline data
│   └── photos/                 # Event photos
├── styles/
│   └── main.css
├── package.json
├── tsconfig.json
└── vite.config.js
```

---

## 7. Acceptance Criteria

### 7.1 Must Have (MVP)
- ✅ All three lanes render with correct colors and initial widths
- ✅ Space bar starts auto-scroll at 200px/second
- ✅ Auto-scroll pauses at events where isKeyMoment=true
- ✅ 12-15 photo moments display full-screen with captions
- ✅ Engineer and project counters update correctly
- ✅ Particle animations appear for joins with name labels
- ✅ People lane width increases by 1px per person
- ✅ Project lane width increases by widthIncrement per project
- ✅ Timeline runs offline (no network required)
- ✅ Dummy data loads and displays correctly
- ✅ No console errors in Chrome 140

### 7.2 Should Have
- ✅ Left arrow reverses scroll direction
- ✅ Space bar toggles pause/resume during scroll
- ✅ Event markers display as vertical lines with labels
- ✅ Departure curves render for people leaving
- ✅ People lane width decreases by 1px when person leaves
- ✅ Year gridlines visible as vertical lines

### 7.3 Nice to Have (If Time Permits)
- ⚪ Smooth counter counting animation
- ⚪ Hover tooltips on event markers
- ⚪ Fade-in on initial load
- ⚪ Keyboard shortcut reference (press '?')

### 7.4 Explicitly Out of Scope
- ❌ Finale zoom-out view
- ❌ Individual named tributaries
- ❌ Lane pulse effects on particle arrival
- ❌ Mobile responsive design
- ❌ Data editing interface
- ❌ Export to video
- ❌ Production-ready error handling
- ❌ Accessibility features (WCAG compliance)
- ❌ Browser compatibility beyond Chrome 140

---

## 8. Testing & Validation

### 8.1 Manual Test Cases

**TC-001: Basic Auto-Scroll**
1. Load application
2. Press Space
3. ✓ Timeline should start scrolling at steady pace
4. ✓ Should pause automatically at first key event
5. Press Space again
6. ✓ Should resume scrolling

**TC-002: Photo Display**
1. Auto-scroll to first photo event
2. ✓ Auto-scroll should pause
3. ✓ Photo should fill 60-70% of screen
4. ✓ Caption visible at bottom
5. Wait 2.5s OR press Space
6. ✓ Photo should shrink to thumbnail at event marker

**TC-003: Lane Width Growth**
1. Note starting people lane width (should be 2px)
2. Auto-scroll through timeline
3. ✓ People lane should grow by 1px for each join
4. ✓ People lane should shrink by 1px for each departure
5. ✓ Project lane should grow by widthIncrement for each project start
6. ✓ Final widths should match cumulative totals

**TC-004: Particle Animations**
1. Advance to first person join
2. ✓ Blue particle with name label should animate from below
3. ✓ Particle and label should disappear after merging
4. Advance to first project start
5. ✓ Green particle with name label should animate from above
6. ✓ Particle and label should disappear after merging

**TC-005: Scroll Speed Consistency**
1. Note time to scroll 400px (should be ~2 seconds at 200px/sec)
2. Measure at different points in timeline
3. ✓ Speed should be constant regardless of distance to next key event

**TC-006: Data Loading**
1. Modify `data.json` with test data
2. Reload application
3. ✓ New data should render correctly
4. ✓ No hardcoded values visible

### 8.2 Edge Cases to Handle

- **Empty data:** Display error message if JSON missing
- **Invalid dates:** Gracefully skip malformed date entries
- **Missing photos:** Show placeholder if photo URL 404s
- **Single year:** Timeline should still render
- **No key events:** Auto-scroll runs continuously to end
- **Rapid keypresses:** Debounce input to prevent conflicts

---

## 9. Delivery Checklist

### 9.1 Code Deliverables
- [ ] Working prototype in Chrome 140
- [ ] `data.json` with sample/dummy data
- [ ] `README.md` with setup instructions
- [ ] All source files in `src/`
- [ ] Build configuration (Vite)

### 9.2 Documentation
- [ ] Comment explaining data format
- [ ] Inline code comments for complex logic
- [ ] Instructions to swap in real data

### 9.3 Assets Required from Client
- [ ] Real timeline data (people, projects, events)
- [ ] 12-15 high-res photos (at least 1200px wide)
- [ ] Photo captions (1 sentence each)
- [ ] Approval on color palette
- [ ] widthIncrement values for each project

---

## 10. Non-Functional Requirements

### 10.1 Performance
- Initial load: < 2 seconds on presenter's laptop
- Animation framerate: Maintain 60fps during auto-scroll
- Memory: < 200MB browser footprint

### 10.2 Browser Compatibility
- Chrome 140 only (presenter's laptop)
- No other browser testing required

### 10.3 Offline Capability
- All assets bundled in build
- No CDN dependencies
- Runs from `file://` protocol

### 10.4 Code Quality
- TypeScript strict mode enabled
- No `any` types in critical paths
- ESLint clean (can use loose config given prototype status)

---

**Document Status:** Ready for Implementation  
**Last Updated:** 2025-10-24  
**Approved By:** [Pending]