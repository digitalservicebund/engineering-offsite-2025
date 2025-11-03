# Functional Specification: Interactive Engineering Timeline Visualization

**Version:** 1.1  
**Date:** 2025-10-24  
**Effort Estimate:** 1-2 days  
**Purpose:** Presentation prototype for engineering offsite (~60 attendees)

---

## 1. Overview

### 1.1 Product Summary
An interactive, browser-based timeline visualization showing 5 years of engineering organization growth. The system presents people joins/departures, project launches, and milestone events through three color-coded horizontal lanes with particle animations, dynamic lane width growth, and photo-driven narrative beats with thumbnail anchoring.

### 1.2 Success Criteria
- Presenter can start/stop auto-scroll through timeline
- Timeline pauses automatically at key events
- 12-15 key photo moments create emotional engagement with thumbnail anchoring
- Visual clearly shows team growth from 0 to ~60 engineers with particle animations
- Dynamic lane widths reflect cumulative team and project growth
- Particle animations provide visual feedback for joins, departures, and project starts/ends
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

**US-002: Photo Moments with Thumbnail Anchoring**
```
As a presenter
I want key events to display large photos that become persistent thumbnails
So that the audience connects emotionally with milestones

Acceptance Criteria:
- When auto-scroll reaches event with hasPhoto=true, photo fades in over 0.3s
- Photo occupies 60-70% of screen with dark backdrop
- Photo displays with caption overlay until next keypress
- Photo fades to thumbnail (100x100px) anchored at event marker
- Thumbnail persists on timeline after photo display
- Multiple photo events each leave their own thumbnail
- Caption displays below photo during full-screen view
- 12-15 designated photo moments throughout timeline
```

**US-003: Growth Visualization with Particle Animations**
```
As a viewer
I want to see the team and projects growing over time with visual particle animations
So that I understand the organization's evolution

Acceptance Criteria:
- People lane starts at 2px stroke width
- People lane increases by 1px for each person joining
- People lane decreases by 1px for each person leaving
- Project lane starts at 2px stroke width
- Project lane increases by N px for each project starting (N specified in project.widthIncrement field)
- When person joins: blue particle (8px circle) animates from below into people lane over 0.5s
- When person leaves: blue particle animates away from people lane with 👋 emoji
- When project starts: green particle (8px circle) animates from above into project lane over 0.5s
- When project ends: green particle animates away from project lane with 👋 emoji
- All particles display entity name as text label during animation
- Particles and labels disappear after animation completes
- Departure particles use subdued colors (60% opacity) and longer fade duration (600ms)
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

#### FR-002: Particle Animations (Join/Leave/Start/End)
- **People joining:** blue circle (8px radius) animates from below into people lane
  - Start position: 60px below lane
  - Duration: 0.5s ease-out
  - Text label with person's name positioned 15px to the right of circle
  - Circle and label move together
  - Both dissolve (opacity 1 → 0) after reaching lane
- **People leaving:** blue circle animates away from people lane
  - Start position: at lane center
  - Direction: downward and forward (away from lane)
  - Duration: 0.5s ease-out
  - Text label includes 👋 emoji for visual recognition
  - Subdued appearance (60% opacity)
  - Extended travel distance (1.4x further than joins)
- **Project starting:** green circle (8px radius) animates from above into project lane
  - Start position: 60px above lane
  - Duration: 0.5s ease-out
  - Text label with project name positioned 15px to the right of circle
  - Circle and label move together
  - Both dissolve (opacity 1 → 0) after reaching lane
- **Project ending:** green circle animates away from project lane
  - Start position: at lane center
  - Direction: upward and forward (away from lane)
  - Duration: 0.5s ease-out
  - Text label includes 👋 emoji for visual recognition
  - Subdued appearance (60% opacity)
  - Extended travel distance (1.4x further than starts)

#### FR-003: Event Markers and Photo Thumbnails
- Events display as short vertical lines (30px height, 3px width) extending upward from middle lane
- Color: orange (#F5A623)
- Text label with event name positioned at top of vertical line
- Font: 11px, sans-serif
- Events with hasPhoto=true show photo thumbnail (100x100px) anchored at top of vertical line after photo fade-out
- Thumbnails persist on timeline after photo display
- Multiple photo events each leave their own thumbnail
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

#### FR-006: Lane Width Changes
- **People lane width:** Increases by 1px when person joins, decreases by 1px when person leaves
- **Project lane width:** Increases by project.widthIncrement when project starts, decreases by project.widthIncrement when project ends
- **Dynamic rendering:** Lane widths calculated using precomputed cumulative values for smooth performance
- **Visual feedback:** Particle animations provide immediate visual feedback for all join/leave/start/end events

---

## 3. Data Model

### 3.1 Input JSON Schema

**Note:** Photo URLs are derived from event IDs using the pattern `assets/photos/${eventId}.jpg` (convention over configuration). The `photoUrl` field is not stored in the data model.

```json
{
  "startYear": 2020,
  "endYear": 2024,
  "people": [
    {
      "name": "Johann Teig",
      "joined": "2020-03-01",
      "left": null
    },
    {
      "name": "Nora Nichtig", 
      "joined": "2021-06-15",
      "left": "2024-02-01"
    }
  ],
  "projects": [
    {
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
      "caption": null
    },
    {
      "id": "evt2", 
      "date": "2021-10-15",
      "name": "First Team Offsite",
      "isKeyMoment": true,
      "hasPhoto": true,
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
| Particle join/start | 0.5s | ease-out |
| Particle leave/end | 0.5s | ease-out |
| Particle fade-out (join/start) | 300ms | ease-out |
| Particle fade-out (leave/end) | 600ms | ease-out |
| Photo fade-in | 0.3s | ease-in |
| Photo fade-out | 0.3s | ease-out |
| Counter increment | 0.6s | ease-out |
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
    - Show particle animations for joins/starts/leaves/ends
    - Grow/shrink lane widths smoothly based on cumulative counts
    - Increment/decrement counters
  → Monitor for key events (isKeyMoment=true)
  
WHEN reaching event with isKeyMoment=true
  ↓
Pause auto-scroll at event position
  ↓
IF event has hasPhoto=true
  → Fade in full-screen photo (0.3s)
  → Display caption overlay
  → Wait for keypress to proceed to thumbnail
  → Fade photo to thumbnail at event marker (0.3s)
  → Thumbnail persists on timeline
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
│   ├── main.ts                           # Entry point
│   ├── timeline.ts                       # Core timeline class
│   ├── data-loader.ts                    # JSON parsing & validation
│   ├── types.ts                          # TypeScript interfaces
│   ├── config.ts                         # Layout configuration constants
│   ├── viewport-controller.ts            # Auto-scroll and viewport management
│   ├── counter-calculator.ts             # Engineer/project/year counters
│   ├── active-count-calculator.ts        # Generic cumulative count calculator
│   ├── lane-path-generator.ts            # Generic lane path generator
│   ├── particle-animation-controller.ts  # Generic particle animation system
│   ├── photo-controller.ts               # Photo display and thumbnail management
│   └── style.css                         # Application styles
├── public/
│   ├── assets/
│   │   ├── data.json                     # Timeline data
│   │   └── photos/                       # Event photos (convention: ${eventId}.jpg)
│   └── index.html
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
- ✅ 12-15 photo moments display full-screen with captions and thumbnail anchoring
- ✅ Engineer and project counters update correctly
- ✅ Particle animations appear for joins, departures, starts, and ends with name labels
- ✅ People lane width increases by 1px per person joining, decreases by 1px per person leaving
- ✅ Project lane width increases by widthIncrement per project starting, decreases by widthIncrement per project ending
- ✅ Departure particles use subdued colors and 👋 emoji for visual recognition
- ✅ Timeline runs offline (no network required)
- ✅ Dummy data loads and displays correctly
- ✅ No console errors in Chrome 140

### 7.2 Should Have
- ✅ Left arrow reverses scroll direction
- ✅ Space bar toggles pause/resume during scroll
- ✅ Event markers display as vertical lines with labels
- ✅ Departure particles render for people leaving and projects ending
- ✅ People lane width decreases by 1px when person leaves
- ✅ Project lane width decreases by widthIncrement when project ends
- ✅ Year gridlines visible as vertical lines
- ✅ Photo thumbnails persist on timeline after display

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

**TC-002: Photo Display with Thumbnail Anchoring**
1. Auto-scroll to first photo event
2. ✓ Auto-scroll should pause
3. ✓ Photo should fill 60-70% of screen with dark backdrop
4. ✓ Caption visible at bottom
5. Press Space to proceed
6. ✓ Photo should shrink to 100x100px thumbnail at event marker
7. ✓ Thumbnail should persist on timeline after auto-scroll resumes

**TC-003: Dynamic Lane Width Growth**
1. Note starting lane widths (both should be 2px)
2. Auto-scroll through timeline
3. ✓ People lane should grow by 1px for each join, shrink by 1px for each departure
4. ✓ Project lane should grow by widthIncrement for each project start, shrink by widthIncrement for each project end
5. ✓ Lane widths should reflect cumulative active counts at any point in time
6. ✓ Final widths should match cumulative totals

**TC-004: Particle Animations (All Types)**
1. Advance to first person join
2. ✓ Blue particle with name label should animate from below into people lane
3. ✓ Particle and label should disappear after merging
4. Advance to first project start
5. ✓ Green particle with name label should animate from above into project lane
6. ✓ Particle and label should disappear after merging
7. Advance to first person departure
8. ✓ Blue particle with 👋 emoji should animate away from people lane (subdued color)
9. Advance to first project end
10. ✓ Green particle with 👋 emoji should animate away from project lane (subdued color)

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
- **Missing photos:** Block timeline execution with error overlay (configuration error)
- **Single year:** Timeline should still render
- **No key events:** Auto-scroll runs continuously to end
- **Rapid keypresses:** Debounce input to prevent conflicts
- **Multiple simultaneous particles:** All particle types can animate simultaneously
- **Photo validation:** Timeline validates all required photo files on startup

---

## 9. Delivery Checklist

### 9.1 Code Deliverables
- [x] Working prototype in Chrome 140
- [x] `data.json` with sample/dummy data
- [x] `README.md` with setup instructions
- [x] All source files in `src/` (11 TypeScript files)
- [x] Build configuration (Vite)
- [x] Generic particle animation system
- [x] Photo display with thumbnail anchoring
- [x] Dynamic lane width growth for both people and projects

### 9.2 Documentation
- [x] Comment explaining data format
- [x] Inline code comments for complex logic
- [x] Instructions to swap in real data
- [x] Comprehensive workplans for each development slice
- [x] Manual testing guides

### 9.3 Assets Required from Client
- [x] Real timeline data (people, projects, events) - using sample data
- [x] 12-15 high-res photos (at least 1200px wide) - using sample photos
- [x] Photo captions (1 sentence each) - using sample captions
- [x] Approval on color palette - implemented as specified
- [x] widthIncrement values for each project - using sample values

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