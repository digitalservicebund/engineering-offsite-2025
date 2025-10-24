## Storyboard: Expanding Timeline with Pop-Up Event Photos

**Layout Structure:**

* **Bottom lane:** People joining/leaving. A line that grows thicker over time as the team expands. Departures branch off downward or fade softly, symbolizing exits.
* **Middle lane:** Events & milestones. The visual anchor of the composition, constant in thickness. Each event appears as a node or icon with a label (e.g., first offsite, major release, reorg).
* **Top lane:** Projects starting and evolving. Represented by arcs or segments extending rightward, with line thickness increasing as projects accumulate.

**Visual Encoding:**

* Distinct colors per lane: e.g., blue (people), orange (events), green (projects).
* People and project lines grow thicker with time; event line remains stable.
* Each item (node, icon, or label) fades and slides in with a subtle animation.

**Flow and Camera Motion:**

1. **Intro scene:** Shows the leftmost year (2019) in a fixed viewport, with empty lanes and faint year markers.
2. **Progression:** Each click (or arrow key press) pans the camera smoothly to the right, revealing the next time slice while extending all three lanes.
3. **Growth animation:** The bottom (people) and top (projects) lanes gradually thicken; the middle (events) lane stays constant.
4. **Events appearing:** When an event node is reached, it triggers a **photo pop-up** moment.

   * The photo (or collage) appears in the foreground, taking up a large portion of the screen.
   * The photo fades in together with a short caption or date, creating a narrative pause.
   * After a brief moment, the photo fades out or slides aside to anchor next to the event node on the timeline.
5. **Departures:** In the people lane, small downward branches indicate exits.
6. **Finale:** The final click zooms out to show the *entire timeline* — all years, people, projects, and events visible at once — with the full growth arc revealed.

**Design Details:**

* Consistent, minimalist color palette with warm tones for events.
* Subtle gridlines marking years.
* Smooth bezier curves in lanes for organic continuity.
* Fading gradients at left/right edges to imply continuity beyond view.

**Emotional Arc:**

* Begins simple and linear → grows richer with more people and projects → punctuated by large, photo-driven emotional beats → culminates in an inspiring, complete overview of collective growth.
