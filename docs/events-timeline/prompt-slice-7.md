You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 7 - Photo Pop-up with Thumbnail Anchoring

**Goal:** Full-screen photo display on key events with fade-to-thumbnail transition.

**What to build:**
1. Detect when auto-scroll pauses at event with hasPhoto=true:
   - Check paused event for hasPhoto property
   - Load photo from event.photoUrl
2. Display full-screen photo overlay:
   - Fade in photo over 0.3s to occupy 60-70% of screen
   - Center photo on dark backdrop (rgba(0,0,0,0.7))
   - Display event.caption as text overlay at bottom
   - Use white text (24px, 300 weight) for caption
3. Auto-resume or manual resume:
   - Space keypress → proceed to fade-out
4. Fade photo to thumbnail:
   - Animate photo from center position to event marker position
   - Shrink to 100×100px thumbnail
   - Anchor thumbnail at top of event's vertical line marker, either above or below the text label (prefer above but do below if easier)
   - Remove backdrop, keep thumbnail visible on timeline

**Expected output:**
Auto-scroll pauses at photo event → large photo fades in with caption → after keypress → photo shrinks and moves to timeline as small thumbnail above the event marker.

**Success criteria:**
- Photo fades in smoothly (0.3s) and occupies 60-70% of screen
- Caption visible and readable below photo
- Dark backdrop behind photo
- Responds to Space keypress
- Photo smoothly transitions to 100×100px thumbnail at event marker
- Thumbnail persists on timeline at correct position
- Multiple photo events each leave their own thumbnail

**Reference sections in spec:**
- Section 3.1 (Data Model - events with hasPhoto, photoUrl, caption)
- Section 4.3 (Typography - photo captions)
- Section 4.4 (Animation Timings - photo fade-in/out: 0.3s)
- FR-003 (Event Markers - thumbnail anchoring)
- Section 5.2 (Standard Auto-Scroll Flow - photo display logic)
- US-002 (Photo Moments acceptance criteria)

Tip: Use CSS transforms (scale + translate) for smooth photo-to-thumbnail animation. Consider using HTML overlay for photo, then append thumbnail as SVG foreignObject or positioned HTML element. This builds on Slice 5's pause system.