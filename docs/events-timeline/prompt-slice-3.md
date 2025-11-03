You are implementing an interactive timeline visualization for a presentation. Read the attached functional specification carefully.

**Your task:** Implement Slice 3 - Manual Scroll Control + Counter Updates

**Goal:** Implement keyboard-controlled horizontal scroll with live counters that update based on viewport position.

**What to build:**
1. Add keyboard event listeners:
   - Space bar or Right arrow: pan timeline right by ~400px
   - Left arrow: pan timeline left by ~400px
2. Implement smooth panning using CSS transform (translateX) with transitions
3. Create counter display in top-right corner (fixed position):
   - "Engineers: X" (count active people at viewport center date)
   - "Projects: Y" (count active projects at viewport center date)
   - "Year: YYYY" (year at viewport center)
4. Update counters in real-time as timeline scrolls

**Expected output:**
Press Space/Right arrow → timeline pans smoothly to the right. Top-right counters update to show engineer count, project count, and current year based on what's visible in the viewport center.

**Success criteria:**
- Space bar and arrow keys control horizontal scrolling
- Smooth CSS transition (not jumpy)
- Three counters visible in top-right corner
- Counters accurately reflect data at viewport center position
- Year counter shows 4-digit year (e.g., "2023")

**Reference sections in spec:**
- Section 3.1 (Data Model - people and projects arrays)
- Section 4.3 (Typography for counters)
- FR-004 (Camera/Viewport Control)
- FR-005 (Counters & Metrics)
- US-001 (for keyboard controls)

Calculate active people/projects by checking if date is between joined/start and left/end dates. This builds on Slices 1-2.