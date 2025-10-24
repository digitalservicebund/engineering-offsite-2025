Milestone Map: Interactive Timeline Visualization
Engineer: Senior Frontend / Data Viz Specialist
Target: 10 vertical slices, each ≤2h, end-to-end functional

Slice 1: Static Three-Lane Foundation
Goal: Render basic timeline structure with real data
Input → Output Flow:

Load data.json → Parse dates/years → Calculate timeline width → Render SVG with three lanes + year gridlines

Deliverable (Visible):

Three colored horizontal lines at correct vertical positions (2px/8px/2px widths)
Vertical gridlines at year boundaries with year labels
Timeline scrollable in viewport (manual scroll bar)

Technical Scope:

Vite setup + D3 import
JSON loader with basic validation
SVG container with proper dimensions
D3 scales (time → x position)
Lane rendering (static paths)

Success Check:
Open browser → see three lanes spanning 5 years with gridlines
Time: ~1.5-2h

Slice 2: Event Markers with Basic Data Binding
Goal: Show all events as vertical markers at correct positions
Input → Output Flow:

Events array → Sort by date → Map to x positions → Render vertical lines + labels

Deliverable (Visible):

Orange vertical lines (30px tall) at each event position
Event names as text labels above lines
Visual distinction: key events vs regular events (e.g., bold text)

Technical Scope:

Data transformation: events → timeline points
D3 data binding for event markers
Text positioning/truncation logic
isKeyMoment property visualization

Success Check:
See 15-20 event markers distributed across timeline with readable labels
Time: ~1.5h

Slice 3: Manual Scroll Control + Counter Updates
Goal: Implement keyboard-controlled horizontal scroll with live counters
Input → Output Flow:

Keypress (Space/Arrow) → Calculate new scroll position → Update transform → Recalculate visible date range → Update counters

Deliverable (Visible):

Space/Right arrow pans timeline right
Left arrow pans timeline left
Top-right counters show: "Engineers: X | Projects: Y | Year: YYYY"
Year updates based on viewport center position

Technical Scope:

Keyboard event listeners
CSS transform animation (translateX)
Counter component with real-time calculation
Viewport → date range mapping

Success Check:
Press space → timeline pans smoothly → counters update to reflect visible year
Time: ~2h

Slice 4: Dynamic Lane Width Growth (People Only)
Goal: People lane thickness changes based on headcount at viewport position
Input → Output Flow:

Scroll position → Calculate active people at timestamp → Compute stroke width (2px + count) → Update lane rendering

Deliverable (Visible):

People lane starts at 2px on left
Grows progressively thicker as you scroll right
Width matches cumulative headcount (e.g., 2px → 15px → 42px)
Smooth transition when scrolling

Technical Scope:

Cumulative sum calculation for people joins/departures
D3 transition for stroke-width attribute
Timeline points array with precomputed widths
Real-time width lookup based on scroll position

Success Check:
Scroll through timeline → people lane visibly thickens → final width = 2 + total_people
Time: ~2h

Slice 5: Auto-Scroll with Key Event Pausing
Goal: Continuous auto-scroll that stops at isKeyMoment=true events
Input → Output Flow:

Space keypress → Start interval timer → Update scroll position at 200px/sec → Detect key event in path → Pause at event position

Deliverable (Visible):

Press space → timeline auto-scrolls smoothly
Automatically pauses when reaching key event
Visual indicator when paused (e.g., pulsing event marker)
Press space again → resumes from pause point

Technical Scope:

requestAnimationFrame loop for smooth 200px/sec scroll
Collision detection: current position vs key event positions
State machine: scrolling/paused/stopped
Pause/resume logic

Success Check:
Start auto-scroll → watch it pause at 3-4 key events → resume manually each time
Time: ~2h

Slice 6: Particle Join Animations (People Only)
Goal: Animated particles appear when person joins during auto-scroll
Input → Output Flow:

Auto-scroll reaches person join date → Trigger particle spawn → Animate circle + label from below → Dissolve on lane contact → Increment lane width by 1px

Deliverable (Visible):

Blue circle with person name animates upward from below people lane
Takes 0.5s to reach lane
Particle + text fade out on arrival
Lane width increases by 1px simultaneously

Technical Scope:

Particle spawning system (D3 enter/exit)
Coordinate calculation (60px below lane → lane position)
Text label positioning relative to circle
Synchronization: animation end → width update

Success Check:
Auto-scroll through year 1 → see 3-5 particles animate in → lane grows accordingly
Time: ~2h

Slice 7: Photo Pop-up with Thumbnail Anchoring
Goal: Full-screen photo display on key events with fade-to-thumbnail
Input → Output Flow:

Auto-scroll pauses at hasPhoto=true event → Fade in full-screen photo overlay → Display caption → Auto-resume after 2.5s → Fade photo to thumbnail at event marker

Deliverable (Visible):

Large photo (60-70% screen) appears centered with dark backdrop
Caption text overlaid at bottom
After 2.5s, photo shrinks and moves to anchor point above event marker
Thumbnail (150x150px) persists on timeline

Technical Scope:

Photo overlay component (HTML/CSS)
Fade in/out transitions (opacity + scale)
Absolute positioning → relative positioning transform
Thumbnail persistence (append to SVG as foreign object or HTML)
Timer logic for auto-resume

Success Check:
Auto-scroll hits first photo event → photo takes over screen → shrinks to timeline thumbnail
Time: ~2h

Slice 8: Dynamic Lane Width Growth (Projects)
Goal: Project lane thickness changes based on widthIncrement at viewport position
Input → Output Flow:

Scroll position → Calculate active projects at timestamp → Sum widthIncrement values → Compute stroke width (2px + sum) → Update lane rendering

Deliverable (Visible):

Project lane starts at 2px on left
Grows by project.widthIncrement each time project starts
Width reflects cumulative project complexity (e.g., 2px → 5px → 11px)
Smooth transition when scrolling

Technical Scope:

Cumulative sum calculation for project.widthIncrement
Reuse width update logic from Slice 4 (people lane)
Timeline points array extended with project widths
Real-time width lookup based on scroll position

Success Check:
Scroll through timeline → project lane grows in steps → width = 2 + sum(all widthIncrements)
Time: ~1.5h

Slice 9: Particle Join Animations (Projects)
Goal: Animated particles appear when project starts during auto-scroll
Input → Output Flow:

Auto-scroll reaches project start date → Trigger particle spawn → Animate circle + label from above → Dissolve on lane contact → Increment lane width by widthIncrement

Deliverable (Visible):

Green circle with project name animates downward from above project lane
Takes 0.5s to reach lane
Particle + text fade out on arrival
Lane width increases by widthIncrement simultaneously

Technical Scope:

Reuse particle system from Slice 6
Coordinate calculation (60px above lane → lane position)
Direction reversal (downward instead of upward)
Width increment tied to project.widthIncrement field

Success Check:
Auto-scroll through timeline → see 2-4 project particles animate from above → lane grows accordingly
Time: ~1.5h

Slice 10: Departure Curves (People Leaving)
Goal: Downward-branching curves appear when people leave
Input → Output Flow:

Auto-scroll reaches person departure date → Calculate bezier curve from lane downward → Render departure line → Fade out curve → Decrement lane width by 1px

Deliverable (Visible):

Small blue curve (2px wide) branches downward 40px from people lane
Curve uses gentle quadratic bezier
Fades to 30% opacity over 0.4s
People lane width decreases by 1px

Technical Scope:

Bezier curve generation (D3.path or SVG path string)
Control point calculation for natural arc
Fade-out animation (opacity transition)
Width decrement synchronization
Curve positioning at exact departure date x-coordinate

Success Check:
Auto-scroll past departure dates → see 2-3 curves branch down → people lane shrinks → curves fade but remain visible
Time: ~2h