# Project Brief: Interactive “History of Engineering” Timeline Visualization

## 0. Project background

Audience: ~60 engineers at an engineering offsite; I’ll drive a click-through presentation.

Goal: Show how “Engineering at DS” grew over ~5 years — people, projects, structures, “firsts.”

Format: Browser-based, slideshow-like advancing via click or play/pause.

Constraints: Should be explorable offline; must be backed by code (not static video).

Non-goals: Not an exhaustive history; not an interactive product beyond the presentation; not production-ready, very much throw-away code.

Appetite: ~1-2 days of prototyping, good enough for offsite, potentially reusable later.

## 1. Objective

Create an **interactive timeline visualization** for our upcoming engineering offsite.
The visualization should show how the engineering organization has **grown and evolved over five years** — people joining/leaving, projects starting, and key events along the way — in a way that is both **data-driven** and **emotionally engaging**.

---

## 2. Core Concept

A horizontal timeline made of three "rivers" (people / projects / structures+firsts) that expands to the right as time advances. Tributary lines branch in when people/projects “join.”

Visual vibe: Inspired by Sankey diagrams but simplified.

Each lane represents a different category of data:

| Lane       | Data type | Visual behavior                                                                                                                 |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Top**    | Projects  | Line grows thicker as new projects appear; small *tributary lines* join from above to symbolize new projects starting.                       |
| **Middle** | Events    | Constant-thickness line with event markers (visual marker plus text); some key events trigger a **photo pop-up** moment.                                  |
| **Bottom** | People    | Line grows thicker over time as new people join; small *tributary lines* join from below for new joiners, and **branches curve down** for leavers. |

Counters show accumulation of people, projects, possibly other numbers over time.

---

## 3. Interaction & Animation Flow

1. **Intro** — Empty canvas showing the first event and first year marker.
2. **Advance / click** —
   * Center timeline starts expanding rightward by one event (fixed camera window).
   * People and projects lines appear once the first occurences for their lines happen.
   * People and projects lines *thicken smoothly*; tributaries merge in.
   * New events appear on the center line, with a brief fade-in if they have a photo.
3. **Event pop-ups** —
   * When an event is reached that has a photo, this photo fades in, taking over much of the screen for ~1 s.
   * Then fades back, anchoring as a small thumbnail near that event node.
4. **Departures** — Small, curved downward lines fade out gracefully at the bottom.
5. **Finale** —
   * Camera zooms out to reveal the entire 5-year timeline.
   * All lines visible, fully thickened.

---

## 4. Visual Style

* **Color palette**

  * People → `#4A90E2` (blue)
  * Projects → `#7ED321` (green)
  * Events → `#F5A623` (orange)
* **Line style**

  * Smooth bezier curves, subtle growth in thickness.
  * Tributary lines 1–2 px thinner than main lanes.
* **Layout**

  * Clear horizontal alignment with year gridlines.
  * Minimalist background (light or dark neutral).
* **Motion**

  * Ease-in/out transitions; ~0.6 s for growth and merges, ~1.0 s for pan.
  * No hard cuts or jumps.

---

## 5. Data Model (proposed JSON schema)


```json
{
  "people": [
    {"id": "p1", "joined": "2020-03-01", "name": "Johann Teig"},
    {"id": "p2", "joined": "2021-06-15", "left": "2024-02-01", "name": "Nora Nichtig"}
  ],
  "projects": [
    {"id": "proj1", "start": "2021-01-01", "name": "Platform"},
    {"id": "proj2", "start": "2023-05-01", "name": "Infra Modernization"}
  ],
  "events": [
    {"id": "evt1", "date": "2021-09-15", "name": "Games night"}
    {"id": "evt1", "date": "2021-10-01", "name": "First Offsite", "photo": "offsite.jpg"}
  ]
}
```

The visualization should be data-driven: line thickness and tributaries calculated dynamically from counts of people/projects.

---

## 6. Tech Stack & Implementation Notes

Modern HTML and CSS + TypeScript + Vite + D3.js. No frameworks. No \<canvas\>. D3 transitions for panning, easing, and line growth.

---

## 7. Deliverables

1. **Prototype:** working in-browser demo with dummy data.
2. **Configurable JSON input:** easily swapped for real dataset.
3. **Design parity:** match Excalidraw sketch for structure (3 lanes, tributaries, photo pop-ups).

---qw

## 8. References & Assets

* **Storyboard:** [Storyboard: Expanding Timeline with Pop-Up Event Photos](storyboard.md)
* **Rough sketch:** [Three-Lane Tributary Timeline](sketch.png)
* **Visual inspiration:** Sankey/streamgraph style for tributary motion.
* **Mood:** minimalist, organic growth, emotional rhythm, soft colours and shapes.

---
