# Slice 7 Implementation Plan: Photo Pop-up with Thumbnail Anchoring

**Status:** 📋 PLANNING  
**Created:** 2025-10-28  
**Updated:** 2025-10-28  

## Summary

Implement full-screen photo display for key events with `hasPhoto=true`. Photos fade in when auto-scroll pauses, display with caption overlay, then fade/shrink to thumbnail position at event marker on Space keypress. Multiple photo events each leave persistent thumbnails on the timeline.

---

## Context Analysis

✅ **Already in place from Slices 1-6:**
- Timeline SVG with three lanes rendered
- Auto-scroll system with pause detection at key events (Slice 5)
- `ViewportController` with state machine (`idle`/`scrolling`/`paused`)
- Key event positions pre-calculated and pause detection working
- Event data model includes `hasPhoto`, `photoUrl`, `caption` fields
- Event markers rendered with `data-id` attributes for selection
- D3 transitions and animation infrastructure
- Timeline `highlightEvent()` method for visual indicators
- Keyboard controls with Space/Right/Left arrow handling
- `onKeyEventReached` callback when pausing at key events

❌ **Not yet implemented (needed for Slice 7):**
- Photo overlay HTML element and styling
- Photo loading and display logic
- Full-screen photo fade-in animation
- Caption text overlay on photos
- Photo-to-thumbnail shrink/move animation
- Thumbnail positioning and anchoring at event markers
- Thumbnail persistence (remains visible after fade)
- Multiple thumbnail management (one per photo event)
- Photo event detection in pause handler
- State tracking for "showing photo" vs "normal pause"

🔍 **Key architectural decisions:**
- Use HTML overlay for photo (not SVG) - easier for image display and CSS transitions
- Thumbnails can be HTML positioned absolutely or SVG foreignObject
- Photo state adds complexity to existing pause/resume flow
- Need to track "which photo is currently displayed" for proper cleanup
- Thumbnails must persist after auto-scroll resumes (not temporary like particles)
- CSS transforms for photo-to-thumbnail animation (scale + translate)

---

## Detailed Task Breakdown

### Phase 1: Configuration & Types
**Status:** Pending

**Task 1.1: Add photo display configuration to `config.ts`**
- Add photo display settings:
  ```typescript
  photoDisplay: {
    overlayBackdropColor: 'rgba(0, 0, 0, 0.7)', // Dark backdrop
    photoMaxWidthPercent: 70, // 60-70% of screen width
    photoMaxHeightPercent: 70, // Similar constraint for height
    fadeInDuration: 300, // ms - photo fade-in timing
    fadeOutDuration: 300, // ms - photo fade-out/shrink timing
    captionFontSize: 24, // px - caption text size
    captionFontWeight: 300, // Light weight for elegance
    captionColor: '#FFFFFF', // White text
    captionOffsetY: 40, // px - distance from bottom of photo to caption
    thumbnailSize: 100, // px - thumbnail width/height (square)
    thumbnailOffsetY: -10, // px - distance above event marker line (negative = above)
  }
  ```
- **Rationale:** Centralizes all photo display parameters. Thumbnail size set to 100×100px per prompt. Offset negative to place above marker (easier than below).

**Task 1.2: Add types for photo state tracking**
- Add to `types.ts`:
  ```typescript
  export interface PhotoState {
    eventId: string;
    eventName: string; // For caption fallback
    caption: string | null;
    markerX: number; // x-position of event marker for thumbnail anchoring
    markerY: number; // y-position of event marker for thumbnail anchoring
    phase: 'loading' | 'fullscreen' | 'transitioning' | 'thumbnail';
    photoElement?: HTMLElement; // Reference to photo element (re-used for both overlay and thumbnail)
  }
  ```
- **Rationale:** Tracks current photo display state and DOM references. Simplified to re-use single photo element for both full-screen and thumbnail. Store eventName for caption fallback.

**Task 1.3: Convention over configuration for photo URLs**
- Photo URLs derived from eventId:
  - Pattern: `assets/photos/${eventId}.jpg`
  - Example: event with id "evt-offsite-2021" → `assets/photos/evt-offsite-2021.jpg`
- If caption is null, fallback to event name
- Remove `photoUrl` from data model (it's derived, not stored)
- **Rationale:** Convention over configuration reduces data complexity. Predictable filenames easier to manage.

---

### Phase 2: Photo Overlay HTML Structure & Styling
**Status:** Pending

**Task 2.1: Create photo overlay HTML structure in `main.ts`**
- After timeline initialization, create photo overlay container:
  ```typescript
  const photoOverlay = document.createElement('div');
  photoOverlay.id = 'photo-overlay';
  photoOverlay.className = 'photo-overlay hidden'; // Hidden by default
  document.body.appendChild(photoOverlay);
  ```
- Overlay structure (minimal - photo `<img>` element added dynamically):
  ```html
  <div id="photo-overlay" class="photo-overlay hidden">
    <div class="photo-backdrop"></div>
    <div class="photo-caption"></div>
    <!-- <img> element added dynamically by PhotoController -->
  </div>
  ```
- Use `<img>` element for simplicity, good browser support, and easy aspect ratio handling
- **Rationale:** Separate overlay allows full-screen positioning independent of timeline SVG. Hidden by default, shown when needed. Photo `<img>` element re-used for thumbnail.

**Task 2.2: Add photo overlay styles to `style.css`**
- Photo overlay styles:
  ```css
  .photo-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    pointer-events: none; /* Allow keyboard events to pass through */
  }
  
  .photo-overlay.hidden {
    display: none;
  }
  
  .photo-backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    opacity: 0;
    transition: opacity 0.3s ease-in;
  }
  
  .photo-overlay.visible .photo-backdrop {
    opacity: 1;
  }
  
  .photo-fullscreen {
    position: relative;
    max-width: 70vw;
    max-height: 70vh;
    opacity: 0;
    transform: scale(0.95);
    transition: opacity 0.3s ease-in, transform 0.3s ease-in;
    border-radius: 4px;
  }
  
  .photo-overlay.visible .photo-fullscreen {
    opacity: 1;
    transform: scale(1);
  }
  
  .photo-fullscreen img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 4px;
  }
  
  .photo-caption {
    position: relative;
    margin-top: 20px;
    text-align: center;
    color: #FFFFFF;
    font-size: 24px;
    font-weight: 300;
    font-family: sans-serif;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
    max-width: 70vw;
  }
  ```
- **Visual encoding:** Backdrop creates focus on photo, caption positioned below for readability
- **Rationale:** CSS transitions provide smooth fade-in. Photo element can be re-used for thumbnail by changing classes/styles.

**Task 2.3: Add thumbnail styles to `style.css`**
- Thumbnail styles (positioned absolutely on timeline):
  ```css
  .photo-thumbnail {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 4px;
    border: 2px solid #F5A623; /* Orange border matches event color */
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease;
    pointer-events: auto;
    object-fit: cover; /* Maintain aspect ratio when element is re-used from overlay */
  }
  
  .photo-thumbnail:hover {
    transform: scale(1.1);
  }
  ```
- **Note:** Since we're re-using the img element, it already has the image source loaded
- **Rationale:** Absolute positioning allows precise placement at event marker. Border ties thumbnail to event markers visually. `object-fit: cover` handles aspect ratio.

---

### Phase 3: Photo Display Logic (Photo Controller)
**Status:** Pending  
**🎯 INTEGRATION POINT:** Create photo controller and test basic show/hide

**Task 3.1: Create `PhotoController` class in new file `photo-controller.ts`**
- Responsibility: Manage photo overlay display and thumbnail creation
- Constructor parameters:
  ```typescript
  constructor(
    overlayElement: HTMLElement,
    timelineContainer: HTMLElement,
    xScale: d3.ScaleTime<number, number>,
    eventMarkerY: number // y-position of events lane for thumbnail anchoring
  )
  ```
- Private properties:
  ```typescript
  private currentPhotoState: PhotoState | null = null;
  private thumbnails: Map<string, HTMLElement> = new Map(); // eventId → thumbnail element
  ```
- Public methods:
  ```typescript
  public showPhoto(event: Event, markerX: number): Promise<void>
  public hidePhotoAndCreateThumbnail(): Promise<void>
  public cleanup(): void // Remove all photos and thumbnails
  public hasActivePhoto(): boolean
  ```
- **Design pattern:** Controller pattern - encapsulates photo display logic
- **Rationale:** Separate class keeps photo logic isolated from timeline and viewport controllers.

**Task 3.2: Implement `showPhoto()` method**
- Display full-screen photo with fade-in:
  ```typescript
  public async showPhoto(event: Event, markerX: number): Promise<void> {
    if (!event.hasPhoto) {
      console.warn('Event has no photo to display:', event.id);
      return;
    }
    
    // Derive photo URL from event ID (convention over configuration)
    const photoUrl = `assets/photos/${event.id}.jpg`;
    
    // Determine caption (fallback to event name if not specified)
    const caption = event.caption || event.name;
    
    // Store state
    this.currentPhotoState = {
      eventId: event.id,
      eventName: event.name,
      caption,
      markerX,
      markerY: this.eventMarkerY,
      phase: 'loading',
    };
    
    // Create or re-use photo img element
    let img = this.overlayElement.querySelector('.photo-fullscreen') as HTMLImageElement;
    if (!img) {
      img = document.createElement('img');
      img.className = 'photo-fullscreen';
      this.overlayElement.insertBefore(img, this.overlayElement.querySelector('.photo-caption'));
    }
    
    // Store reference for later re-use
    this.currentPhotoState.photoElement = img;
    
    // Load image
    img.src = photoUrl;
    
    // Wait for image to load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => {
        console.error(`Failed to load photo: ${photoUrl}`);
        reject(new Error('Photo load failed'));
      };
    });
    
    // Update caption
    const captionEl = this.overlayElement.querySelector('.photo-caption') as HTMLElement;
    captionEl.textContent = caption;
    
    // Show overlay with fade-in
    this.overlayElement.classList.remove('hidden');
    // Trigger reflow for transition
    void this.overlayElement.offsetWidth;
    this.overlayElement.classList.add('visible');
    
    this.currentPhotoState.phase = 'fullscreen';
    console.log(`✓ Photo displayed: ${event.name}`);
  }
  ```
- **Convention over configuration:** Photo URL derived from event ID (no data field needed)
- **Caption fallback:** Uses event name if caption not specified
- **Element re-use:** Creates img element dynamically, stores reference for thumbnail transition
- **Error handling:** Log error and reject promise on image load failure
- **Rationale:** Simplifies data model, async loading prevents blocking, element re-use enables smooth transition.

**Task 3.3: Implement thumbnail positioning calculation**
- Helper method to calculate thumbnail position:
  ```typescript
  private calculateThumbnailPosition(markerX: number): { x: number; y: number } {
    // Thumbnail centered horizontally on marker
    const x = markerX - LAYOUT.photoDisplay.thumbnailSize / 2;
    
    // Thumbnail positioned above marker line
    const y = this.eventMarkerY + LAYOUT.photoDisplay.thumbnailOffsetY - LAYOUT.photoDisplay.thumbnailSize;
    
    return { x, y };
  }
  ```
- Account for timeline container scroll position (thumbnails positioned absolutely in container)
- **Rationale:** Centralized calculation ensures consistent positioning across all thumbnails.

**Task 3.4: Simplify integration - move photo display into existing callback**
- No changes needed to ViewportController (simpler integration!)
- Photo display logic moved to `onKeyEventReached` callback in main.ts
- **Rationale:** Reuse existing callback instead of adding new one. Simpler architecture.

**Task 3.5: Wire up photo display in `main.ts` (simplified integration)**
- After timeline initialization:
  ```typescript
  // Create photo overlay
  const photoOverlay = createPhotoOverlay(); // Task 2.1
  
  // Create photo controller
  const photoController = new PhotoController(
    photoOverlay,
    container,
    timeline.getXScale(),
    LAYOUT.lanes.events.yPosition
  );
  
  // Modify existing handleKeyEventReached callback to include photo logic
  const handleKeyEventReached = (eventId: string | null): void => {
    // Highlight event marker (existing logic)
    timeline.highlightEvent(eventId);
    
    // If event has photo, show it
    if (eventId) {
      const event = data.events.find(e => e.id === eventId);
      if (event?.hasPhoto) {
        const markerX = timeline.getXScale()(event.date);
        photoController.showPhoto(event, markerX);
      }
    }
  };
  
  // ViewportController constructor unchanged (no new parameter needed)
  const viewportController = new ViewportController(
    container,
    timeline.getTimelineWidth(),
    timeline.getXScale(),
    timeline.getStartDate(),
    timeline.getEndDate(),
    keyEventPositions,
    updateCounters,
    handleKeyEventReached, // Now handles both highlighting and photos
    updateParticles
  );
  ```
- **Rationale:** Reuse existing callback for simpler integration. No changes to ViewportController needed.

---

### Phase 4: Photo-to-Thumbnail Transition Animation
**Status:** Pending

**Task 4.1: Implement `hidePhotoAndCreateThumbnail()` method with element re-use**
- Animate photo from center to thumbnail position, re-using same img element:
  ```typescript
  public async hidePhotoAndCreateThumbnail(): Promise<void> {
    if (!this.currentPhotoState || this.currentPhotoState.phase !== 'fullscreen') {
      console.warn('No photo to hide or already transitioning');
      return;
    }
    
    this.currentPhotoState.phase = 'transitioning';
    
    const { markerX, eventId, photoElement } = this.currentPhotoState;
    if (!photoElement) {
      console.error('Photo element not found');
      return;
    }
    
    const thumbnailPos = this.calculateThumbnailPosition(markerX);
    
    // Get current photo position and size
    const photoRect = photoElement.getBoundingClientRect();
    
    // Calculate transform: from center to thumbnail position
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    
    // Calculate scale factor (from current size to 100x100)
    const scale = LAYOUT.photoDisplay.thumbnailSize / photoRect.width;
    
    // Calculate translation (account for scale transform origin)
    const translateX = thumbnailPos.x - centerX + (photoRect.width / 2) - (LAYOUT.photoDisplay.thumbnailSize / 2);
    const translateY = thumbnailPos.y - centerY + (photoRect.height / 2) - (LAYOUT.photoDisplay.thumbnailSize / 2);
    
    // Apply transform animation via CSS
    photoElement.style.transition = `transform ${LAYOUT.photoDisplay.fadeOutDuration}ms ease-out, opacity ${LAYOUT.photoDisplay.fadeOutDuration}ms ease-out`;
    photoElement.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
    
    // Fade out backdrop and caption
    const backdrop = this.overlayElement.querySelector('.photo-backdrop') as HTMLElement;
    const caption = this.overlayElement.querySelector('.photo-caption') as HTMLElement;
    backdrop.style.transition = `opacity ${LAYOUT.photoDisplay.fadeOutDuration}ms ease-out`;
    backdrop.style.opacity = '0';
    caption.style.transition = `opacity ${LAYOUT.photoDisplay.fadeOutDuration}ms ease-out`;
    caption.style.opacity = '0';
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, LAYOUT.photoDisplay.fadeOutDuration));
    
    // Move photo element to thumbnail position (re-use same element)
    this.convertPhotoToThumbnail(photoElement, eventId, thumbnailPos.x, thumbnailPos.y);
    
    // Hide overlay
    this.overlayElement.classList.remove('visible');
    this.overlayElement.classList.add('hidden');
    
    // Reset overlay styles
    backdrop.style.transition = '';
    backdrop.style.opacity = '';
    caption.style.transition = '';
    caption.style.opacity = '';
    
    // Clear state
    this.currentPhotoState.phase = 'thumbnail';
    this.currentPhotoState = null;
    
    console.log(`✓ Photo transitioned to thumbnail: ${eventId}`);
  }
  ```
- **Element re-use:** Same img element transitions from overlay to thumbnail
- **Trade-offs considered:**
  - ✅ Pro: Smooth visual continuity (literally same element shrinking)
  - ✅ Pro: No need to reload image for thumbnail
  - ✅ Pro: Less DOM manipulation
  - ⚠️ Con: Slightly more complex state management
  - ⚠️ Con: Need to handle element reparenting carefully
- **Rationale:** Re-using element creates seamless visual transition and avoids image reloading.

**Task 4.2: Implement `convertPhotoToThumbnail()` method (element re-use)**
- Convert existing photo element to thumbnail at calculated position:
  ```typescript
  private convertPhotoToThumbnail(photoElement: HTMLElement, eventId: string, x: number, y: number): void {
    // Check if thumbnail already exists (shouldn't happen, but defensive)
    if (this.thumbnails.has(eventId)) {
      console.warn(`Thumbnail already exists for event ${eventId}`);
      return;
    }
    
    // Remove from overlay (if still there)
    if (photoElement.parentElement) {
      photoElement.parentElement.removeChild(photoElement);
    }
    
    // Update element styles for thumbnail display
    photoElement.className = 'photo-thumbnail';
    photoElement.style.position = 'absolute';
    photoElement.style.left = `${x}px`;
    photoElement.style.top = `${y}px`;
    photoElement.style.width = `${LAYOUT.photoDisplay.thumbnailSize}px`;
    photoElement.style.height = `${LAYOUT.photoDisplay.thumbnailSize}px`;
    photoElement.style.transform = ''; // Clear transform
    photoElement.style.transition = '';
    photoElement.style.opacity = '1';
    photoElement.setAttribute('data-event-id', eventId);
    
    // Add to timeline container
    this.timelineContainer.appendChild(photoElement);
    
    // Store reference
    this.thumbnails.set(eventId, photoElement);
    
    console.log(`✓ Thumbnail created at (${x}, ${y}): ${eventId}`);
  }
  ```
- **Element re-use:** Transforms existing img from overlay to thumbnail (no new element created)
- **Note:** Need `object-fit: cover` CSS for thumbnail to maintain aspect ratio within fixed size
- **Rationale:** Re-using element provides seamless transition, no image reload needed.

**Task 4.3: Handle Space keypress during photo display**
- Modify keyboard controls in `main.ts` to check for active photo:
  ```typescript
  const handleKeyDown = (event: KeyboardEvent): void => {
    const { key } = event;
    
    // Handle Space bar
    if (key === ' ') {
      event.preventDefault();
      
      // If photo is displayed, hide it and create thumbnail
      if (photoController.hasActivePhoto()) {
        photoController.hidePhotoAndCreateThumbnail();
        // Then resume auto-scroll
        viewportController.resumeAutoScroll();
        timeline.highlightEvent(null);
        return;
      }
      
      // ... rest of existing Space bar logic ...
    }
    
    // ... rest of keyboard controls ...
  };
  ```
- **Rationale:** Space keypress while photo displayed should trigger thumbnail transition, then resume scroll.

**Task 4.4: Test photo-to-thumbnail animation**
- Create test event with `hasPhoto: true` in data.json
- Verify:
  - Photo fades in smoothly when paused
  - Caption displays correctly
  - Space key triggers shrink animation
  - Thumbnail appears at correct position above event marker
  - Auto-scroll resumes after transition
  - Thumbnail persists on timeline
- **Rationale:** Visual validation critical for smooth user experience.

---

### Phase 5: Multiple Thumbnails & Cleanup
**Status:** Pending

**Task 5.1: Test multiple photo events**
- Add 2-3 photo events spread across timeline
- Auto-scroll through all photo events
- Verify:
  - Each photo displays in sequence
  - Each creates separate thumbnail
  - Thumbnails don't overlap (if positioned properly)
  - All thumbnails persist after scroll completes
- **Expected behavior:** Timeline accumulates thumbnails at each photo event location
- **Rationale:** Multiple photo events create visual timeline markers.

**Task 5.2: Implement thumbnail removal on timeline reset**
- Update `cleanup()` method:
  ```typescript
  public cleanup(): void {
    // Hide and remove overlay if active
    if (this.currentPhotoState) {
      this.overlayElement.classList.remove('visible');
      this.overlayElement.classList.add('hidden');
      this.currentPhotoState = null;
    }
    
    // Remove all thumbnails
    for (const [eventId, thumbnail] of this.thumbnails) {
      thumbnail.remove();
    }
    this.thumbnails.clear();
    
    console.log('✓ Photo controller cleaned up');
  }
  ```
- Call `photoController.cleanup()` in keyboard Left Arrow handler (timeline reset):
  ```typescript
  if (key === 'ArrowLeft') {
    event.preventDefault();
    
    // Clean up animations and photos
    particleAnimationController.cleanup();
    photoController.cleanup(); // Add this
    
    // Reset viewport
    viewportController.resetToStart();
    timeline.highlightEvent(null);
    
    return;
  }
  ```
- **Rationale:** Reset should clear all visual state for clean restart.

**Task 5.3: Handle missing/broken photo URLs**
- Update `showPhoto()` error handling:
  ```typescript
  // In showPhoto(), after setting img.src:
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => {
      const photoUrl = `assets/photos/${event.id}.jpg`;
      console.error(`Failed to load photo: ${photoUrl} for event ${event.name}`);
      // Show placeholder or skip photo
      reject(new Error('Photo load failed'));
    };
  }).catch(error => {
    // Photo load failed - resume auto-scroll without photo
    this.currentPhotoState = null;
    if (this.onPhotoLoadFailed) {
      this.onPhotoLoadFailed();
    }
  });
  ```
- If photo load fails, log error with derived URL path and auto-resume scroll
- **Rationale:** Graceful degradation prevents broken presentation. Convention-based URL makes debugging easier.

**Task 5.4: ~~Add thumbnail click interaction~~** 
- **Decision:** Dropped - not needed for MVP
- **Rationale:** Linear presentation flow doesn't require re-displaying photos.

---

### Phase 6: Integration & Edge Cases
**Status:** Pending

**Task 6.1: Handle photo events without caption**
- Test event with `hasPhoto: true` but `caption: null`
- Verify caption div is empty or hidden
- No visual glitch from missing caption
- **Rationale:** Not all photos may need captions.

**Task 6.2: Handle very long captions**
- Test with caption longer than photo width
- Apply CSS `max-width` and `overflow-wrap` to caption:
  ```css
  .photo-caption {
    max-width: 90%;
    margin: 0 auto;
    overflow-wrap: break-word;
  }
  ```
- **Rationale:** Prevent caption overflow breaking layout.

**Task 6.3: Test thumbnail positioning at timeline edges**
- Photo event at very start of timeline (markerX near 0)
- Photo event at very end of timeline (markerX near timeline width)
- Verify thumbnails don't render off-screen or clipped
- Clamp thumbnail x-position if needed:
  ```typescript
  const x = Math.max(0, Math.min(
    markerX - LAYOUT.photoDisplay.thumbnailSize / 2,
    this.timelineWidth - LAYOUT.photoDisplay.thumbnailSize
  ));
  ```
- **Rationale:** Edge cases can break visual layout.

**Task 6.4: Test with key event that has no photo**
- Verify regular key event pause (no photo) still works
- Highlight event marker, no photo overlay
- Space resumes scroll normally
- **Expected:** Photo system doesn't interfere with non-photo key events
- **Rationale:** Most key events won't have photos.

**Task 6.5: Test rapid keypresses during photo display**
- Press Space multiple times quickly during photo transition
- Should not create duplicate thumbnails or broken state
- Debounce or check `phase` state before allowing actions:
  ```typescript
  if (this.currentPhotoState?.phase === 'transitioning') {
    console.log('Photo transition in progress, ignoring input');
    return;
  }
  ```
- **Rationale:** Prevent user confusion from rapid inputs.

---

### Phase 7: Testing & Validation
**Status:** Pending

**Task 7.1: ~~Create test data with photo events~~**
- **Decision:** Dropped - user will create test data manually
- Test data format (for reference):
  ```json
  {
    "id": "evt-offsite-2021",
    "date": "2021-10-15",
    "name": "First Team Offsite",
    "isKeyMoment": true,
    "hasPhoto": true,
    "caption": "12 engineers gathered in Portland"
  }
  ```
- Photo file should be at: `public/assets/photos/evt-offsite-2021.jpg`
- If no caption specified, event name will be used as fallback

**Task 7.2: Manual testing checklist**
- [ ] Auto-scroll pauses at photo event
- [ ] Photo fades in smoothly over 0.3s
- [ ] Photo occupies 60-70% of screen
- [ ] Dark backdrop visible behind photo
- [ ] Caption displays below photo (if present)
- [ ] Space keypress triggers photo-to-thumbnail animation
- [ ] Photo shrinks and moves to event marker position
- [ ] Thumbnail appears above event marker line
- [ ] Thumbnail size is 100×100px
- [ ] Backdrop fades out during transition
- [ ] Auto-scroll resumes after transition
- [ ] Multiple photo events each create separate thumbnails
- [ ] All thumbnails persist throughout scroll
- [ ] Timeline reset (Left Arrow) clears all thumbnails
- [ ] Can restart and see photos again after reset
- **Rationale:** Comprehensive manual testing ensures all requirements met.

**Task 7.3: Test animation timing and smoothness**
- Verify fade-in duration is 0.3s (300ms)
- Verify fade-out/shrink duration is 0.3s (300ms)
- No jank or stuttering during transitions
- Use browser DevTools Performance tab to check frame rate
- **Expected:** Smooth 60fps transitions
- **Rationale:** Animation quality impacts presentation professionalism.

**Task 7.4: Test with different photo aspect ratios**
- Test with landscape photo (wide)
- Test with portrait photo (tall)
- Test with square photo
- Verify `max-width: 70vw` and `max-height: 70vh` constrain properly
- Photo should maintain aspect ratio (no stretching)
- **Rationale:** Real photos will have varying dimensions.

---

## Success Criteria Checklist

### Photo Display
- [ ] Photo fades in smoothly (0.3s) when auto-scroll pauses at photo event
- [ ] Photo occupies 60-70% of screen (constrained by viewport)
- [ ] Dark backdrop (rgba(0,0,0,0.7)) visible behind photo
- [ ] Photo centered on screen
- [ ] Photo maintains aspect ratio

### Caption Display
- [ ] Caption visible below photo during full-screen view
- [ ] Caption uses white text (24px, 300 weight)
- [ ] Caption readable against backdrop
- [ ] Caption handles missing/null values gracefully
- [ ] Long captions wrap properly

### Photo-to-Thumbnail Transition
- [ ] Space keypress triggers transition animation
- [ ] Photo smoothly shrinks from center to thumbnail size (100×100px)
- [ ] Photo moves to correct position (above event marker)
- [ ] Transition duration is 0.3s
- [ ] Backdrop fades out during transition
- [ ] Animation uses CSS transforms (scale + translate)

### Thumbnail Positioning & Persistence
- [ ] Thumbnail anchored above event marker vertical line
- [ ] Thumbnail horizontally centered on marker
- [ ] Thumbnail positioned 10px above marker top
- [ ] Thumbnail persists after auto-scroll resumes
- [ ] Multiple photo events each create separate thumbnails
- [ ] Thumbnails don't overlap (assuming events spaced reasonably)
- [ ] Thumbnails remain visible throughout scroll session

### Auto-Scroll Integration
- [ ] Auto-scroll pauses at events with `hasPhoto=true`
- [ ] Photo displays automatically on pause
- [ ] Space keypress during photo triggers thumbnail transition
- [ ] Auto-scroll resumes after thumbnail created
- [ ] Non-photo key events still pause normally (no photo displayed)
- [ ] Photo system doesn't interfere with manual pause/resume

### Cleanup & Reset
- [ ] Left Arrow (timeline reset) removes all photos and thumbnails
- [ ] No orphaned DOM elements after cleanup
- [ ] Can restart timeline and see photos again
- [ ] Photo controller properly resets state

### Error Handling
- [ ] Missing photo URL doesn't break timeline
- [ ] Failed image load doesn't stall auto-scroll
- [ ] Events without photos handled gracefully
- [ ] Console logs useful error messages

### Code Quality
- [ ] No TypeScript errors or `any` types
- [ ] No console errors during photo display
- [ ] Configuration values in `config.ts`
- [ ] PhotoController encapsulates photo logic
- [ ] Clean separation from ViewportController and Timeline
- [ ] CSS transitions smooth and performant

---

## Technical Decisions

### 1. Photo overlay implementation: HTML vs SVG
**Decision:** Use HTML overlay for photo display  
**Rationale:**  
- Images easier to display in HTML than SVG
- CSS transitions better for overlay fade effects
- Fixed positioning (full-screen) simpler with HTML
- SVG foreignObject more complex for dynamic images
- Better browser support for image aspect ratio handling

### 2. Thumbnail implementation: HTML vs SVG foreignObject
**Decision:** Use HTML elements positioned absolutely  
**Rationale:**  
- Consistent with photo overlay (same image elements)
- Absolute positioning within timeline container straightforward
- CSS hover effects easier on HTML
- Can layer on top of SVG without z-index issues
- Simpler to remove/cleanup than SVG elements

### 3. Photo-to-thumbnail animation approach
**Decision:** CSS transform (scale + translate) animation  
**Rationale:**  
- GPU-accelerated for smooth performance
- Single transition animates both size and position
- Easier than manually interpolating via JavaScript
- Can use CSS easing functions
- Maintains photo aspect ratio during scale

### 4. Thumbnail positioning: above vs below marker
**Decision:** Position above marker line (negative offset)  
**Rationale:**  
- Prompt suggests "prefer above but do below if easier"
- Above is actually easier (negative offset from marker Y)
- Above doesn't interfere with event label (below marker)
- Visual hierarchy: thumbnail → marker line → label
- Consistent positioning for all thumbnails

### 5. Photo state management: global vs PhotoController
**Decision:** Encapsulate state in PhotoController class  
**Rationale:**  
- Keeps photo logic isolated from viewport/timeline
- Single source of truth for photo state
- Easier to test photo functionality independently
- Cleaner API surface (`showPhoto()`, `hidePhoto()`, `cleanup()`)
- Follows controller pattern from Slice 6 (ParticleAnimationController)

### 6. Space keypress handling during photo display
**Decision:** Space dismisses photo and resumes scroll  
**Rationale:**  
- Spec says "Space keypress → proceed to fade-out"
- Single keypress for both dismiss photo and resume scroll
- Simpler UX than requiring two separate actions
- Matches auto-scroll pause/resume flow

### 7. Photo event detection: separate callback vs existing callback
**Decision:** Add `onPhotoEventReached` callback to ViewportController  
**Rationale:**  
- Photo display is distinct action from highlighting event
- Allows photo logic to be optional/pluggable
- Clean separation of concerns
- Similar pattern to `onParticleUpdate` callback
- ViewportController owns pause detection, delegates photo display

### 8. Thumbnail persistence: temporary vs permanent
**Decision:** Thumbnails persist until timeline reset  
**Rationale:**  
- Spec says "keep thumbnail visible on timeline"
- Creates visual record of photo events viewed
- Different from particles (which fade out)
- Enhances narrative by showing which moments had photos
- Reset clears for fresh presentation run

### 9. Thumbnail click interaction
**Decision:** Skip for MVP (can add if time permits)  
**Rationale:**  
- Not in core requirements
- Presentation is linear (forward scroll)
- Adds complexity (re-displaying photo, managing state)
- Nice-to-have enhancement, not critical
- Focus on core flow first

### 10. Photo loading: async vs blocking
**Decision:** Async image loading with Promise  
**Rationale:**  
- Prevents blocking main thread during load
- Can show loading state if needed
- Handles load errors gracefully
- Modern async/await pattern
- Better user experience (no freeze)

---

## Estimated Complexity

### Development Time Estimates:

- **Phase 1 (Configuration & Types):** ~15-20 minutes
  - Config additions: 10 min
  - Type definitions: 5-10 min

- **Phase 2 (HTML Structure & Styling):** ~40-50 minutes
  - Photo overlay HTML: 10 min
  - Photo overlay CSS: 20-25 min
  - Thumbnail CSS: 10-15 min

- **Phase 3 (Photo Display Logic):** ~80-100 minutes ⭐ (Most complex)
  - PhotoController class structure: 20 min
  - showPhoto() implementation: 25-30 min
  - Thumbnail position calculation: 15 min
  - ViewportController integration: 20-25 min
  - Wire up in main.ts: 10-15 min

- **Phase 4 (Photo-to-Thumbnail Animation):** ~60-80 minutes
  - hidePhotoAndCreateThumbnail() method: 30-40 min
  - createThumbnail() method: 15-20 min
  - Keyboard control updates: 10-15 min
  - Animation testing and tuning: 10-15 min

- **Phase 5 (Multiple Thumbnails & Cleanup):** ~30-40 minutes
  - Multiple thumbnails testing: 10-15 min
  - Cleanup implementation: 10-15 min
  - Error handling: 10 min

- **Phase 6 (Integration & Edge Cases):** ~40-50 minutes
  - Missing caption handling: 10 min
  - Long caption handling: 10 min
  - Edge position clamping: 10-15 min
  - Non-photo key events: 5 min
  - Rapid keypress handling: 10 min

- **Phase 7 (Testing & Validation):** ~30-40 minutes
  - Manual testing checklist: 20-30 min
  - Animation timing validation: 10 min
  - Different aspect ratios: 10-15 min

**Total Estimated Time:** ~4.5-5.5 hours (reduced due to simplifications)

**Complexity Assessment:**
- **High complexity:** Photo-to-thumbnail transform calculation (Phase 4), async image loading (Phase 3)
- **Medium complexity:** PhotoController class architecture, ViewportController integration, CSS animation coordination
- **Low complexity:** Configuration, types, HTML structure, cleanup, testing

**Risk areas:**
- Photo-to-thumbnail transform math (calculating scale and translate together)
- Thumbnail absolute positioning (coordinate space relative to scrolling timeline)
- Image loading errors and timeouts
- Animation smoothness (60fps during transform)
- Z-index layering (photo overlay, thumbnails, SVG)
- Multiple photo events close together (thumbnail overlap)

---

## Reference Sections in Spec

### Functional Requirements:
- **FR-003:** Event Markers
  - "Events with hasPhoto=true show photo thumbnail (150x150px) anchored at top of vertical line after photo fade-out"
  - Note: Prompt-slice-7.md specifies 100×100px, taking precedence

### User Stories:
- **US-002:** Photo Moments
  - "When auto-scroll reaches event with hasPhoto=true, photo fades in over 0.3s"
  - "Photo occupies 60-70% of screen"
  - "Photo displays until next keypress"
  - "Photo fades to thumbnail (150x150px) anchored at event marker"
  - "Caption displays below photo during full-screen view"
  - "12-15 designated photo moments throughout timeline"

### Data Model:
- **Section 3.1:** Input JSON Schema
  - Event fields: `hasPhoto: boolean`, `photoUrl: string | null`, `caption: string | null`

### UI Specifications:
- **Section 4.3:** Typography
  - Photo captions: Inter/System, 24px, 300 weight, white with dark overlay

- **Section 4.4:** Animation Timings
  - Photo fade-in: 0.3s ease-in
  - Photo fade-out: 0.3s ease-out

### Interaction Flows:
- **Section 5.2:** Standard Auto-Scroll Flow
  - "WHEN reaching event with isKeyMoment=true"
  - "IF event has hasPhoto=true → Fade in full-screen photo (0.3s) → Display caption overlay → Auto-resume after 2.5s OR wait for keypress"
  - Note: Prompt specifies manual resume only (Space keypress)

### Prompt Slice 7:
- "Detect when auto-scroll pauses at event with hasPhoto=true"
- "Display full-screen photo overlay: Fade in photo over 0.3s to occupy 60-70% of screen"
- "Center photo on dark backdrop (rgba(0,0,0,0.7))"
- "Display event.caption as text overlay at bottom"
- "Use white text (24px, 300 weight) for caption"
- "Space keypress → proceed to fade-out"
- "Fade photo to thumbnail: Animate photo from center position to event marker position"
- "Shrink to 100×100px thumbnail"
- "Anchor thumbnail at top of event's vertical line marker, either above or below the text label (prefer above but do below if easier)"
- "Remove backdrop, keep thumbnail visible on timeline"

---

## Dependencies & Prerequisites

**Required before starting:**
- ✅ Slices 1-6 complete (timeline, viewport, counters, lanes, auto-scroll, particles)
- ✅ Auto-scroll system with pause detection at key events (Slice 5)
- ✅ Event data includes `hasPhoto`, `photoUrl`, `caption` fields
- ✅ ViewportController with state machine and pause logic
- ✅ Timeline event markers with `data-id` attributes
- ✅ Keyboard controls with Space/Right/Left handling

**New assets needed:**
- 📸 Test photo images (3-5 images for testing)
  - Can use placeholder images or stock photos
  - Recommended: various aspect ratios (landscape, portrait, square)
  - Place in `public/assets/` directory

**No new external dependencies:**
- All functionality uses native browser APIs (Image, HTMLElement)
- D3 only used for existing xScale (date-to-position conversion)
- CSS transitions for animations

**Compatibility:**
- CSS transforms: Supported in all modern browsers
- Promise-based image loading: Standard JavaScript
- Fixed positioning for overlay: CSS standard

---

## Implementation Notes

### Code organization:
```
src/
├── main.ts                      # (Modified) Create photo overlay, wire up PhotoController
├── viewport-controller.ts       # (Modified) Add onPhotoEventReached callback, detect photo events
├── photo-controller.ts          # (New) Manage photo display and thumbnail creation
├── timeline.ts                  # (Unchanged) Already has event data
├── config.ts                    # (Modified) Add photo display configuration
├── types.ts                     # (Modified) Add PhotoState interface
└── style.css                    # (Modified) Add photo overlay and thumbnail styles

public/assets/
└── test-photo-*.jpg             # (New) Test images for photo events
```

### Key classes/methods to add:

**In photo-controller.ts:**
```typescript
export class PhotoController {
  private currentPhotoState: PhotoState | null = null;
  private thumbnails: Map<string, HTMLElement> = new Map();
  private readonly overlayElement: HTMLElement;
  private readonly timelineContainer: HTMLElement;
  private readonly xScale: d3.ScaleTime<number, number>;
  private readonly eventMarkerY: number;
  
  constructor(
    overlayElement: HTMLElement,
    timelineContainer: HTMLElement,
    xScale: d3.ScaleTime<number, number>,
    eventMarkerY: number
  ) { ... }
  
  public async showPhoto(event: Event, markerX: number): Promise<void> { ... }
  public async hidePhotoAndCreateThumbnail(): Promise<void> { ... }
  public hasActivePhoto(): boolean { ... }
  public cleanup(): void { ... }
  
  private calculateThumbnailPosition(markerX: number): { x: number; y: number } { ... }
  private createThumbnail(eventId: string, photoUrl: string, x: number, y: number): void { ... }
}
```

**In viewport-controller.ts:**
```typescript
// Add to constructor parameters
onPhotoEventReached?: (eventId: string) => void

// Modify checkForKeyEventPause() to return photo info
private checkForKeyEventPause(): { eventId: string; hasPhoto: boolean } | null { ... }

// In autoScrollLoop(), trigger photo callback
if (pauseInfo.hasPhoto && this.onPhotoEventReached) {
  this.onPhotoEventReached(pauseInfo.eventId);
}
```

**In main.ts:**
```typescript
// Create photo overlay
const photoOverlay = createPhotoOverlay();

// Create photo controller
const photoController = new PhotoController(
  photoOverlay,
  container,
  timeline.getXScale(),
  LAYOUT.lanes.events.yPosition
);

// Create photo event callback
const handlePhotoEvent = (eventId: string): void => { ... };

// Update keyboard controls
const handleKeyDown = (event: KeyboardEvent): void => {
  if (key === ' ' && photoController.hasActivePhoto()) {
    photoController.hidePhotoAndCreateThumbnail();
    viewportController.resumeAutoScroll();
    return;
  }
  // ... rest of keyboard logic
};
```

### Potential gotchas:

1. **Transform coordinate space:** Photo overlay uses viewport coords, thumbnails use timeline coords
   - Solution: Calculate thumbnail position in timeline coordinate space
   - Account for timeline scroll offset if container scrolls

2. **Image aspect ratio:** Photos may be very wide or very tall
   - Solution: Use both `max-width: 70vw` AND `max-height: 70vh`
   - CSS `width: 100%` and `height: auto` maintains aspect ratio

3. **Transform origin during scale:** Default origin is center, may need adjustment
   - Solution: Calculate translate accounting for scale transform origin
   - Test with extreme aspect ratios to validate math

4. **Z-index layering:** Photo overlay, thumbnails, SVG timeline
   - Solution: Overlay at `z-index: 1000`, thumbnails higher than SVG
   - Test that thumbnails appear on top of timeline elements

5. **Thumbnail positioning at timeline edges:** May render off-screen
   - Solution: Clamp x-position to `[0, timelineWidth - thumbnailSize]`
   - Test with events at very start/end of timeline

6. **Multiple thumbnails at same x-position:** May overlap
   - Solution: Accept overlap for MVP (unlikely with real data)
   - Enhancement: Stagger thumbnails vertically if needed

7. **Async image loading timeout:** Large images may take time to load
   - Solution: Add timeout to image load Promise
   - Show error or fallback if timeout exceeded

8. **Photo cleanup during transition:** User may reset while photo animating
   - Solution: Check `phase` state in cleanup(), interrupt animations
   - Remove both overlay and in-progress thumbnails

9. **Thumbnail persistence across scroll:** HTML positioned absolutely
   - Solution: Thumbnails stay at fixed coordinates in timeline container
   - Automatically scroll with timeline (absolute positioning relative to container)

10. **Caption text shadow readability:** White text needs contrast
    - Solution: Use `text-shadow: 0 2px 4px rgba(0,0,0,0.8)` for legibility
    - Test with light background photos

### Implementation order (recommended):

1. **Phase 1:** Configuration and types (foundation)
2. **Phase 2:** HTML structure and CSS styling (visual setup)
3. **Phase 3:** PhotoController class + basic show/hide (core logic)
   - ⭐ **CHECKPOINT:** Test photo fade-in manually before proceeding
4. **Phase 4:** Photo-to-thumbnail animation (complex transform)
5. **Phase 5:** Multiple thumbnails and cleanup (persistence)
6. **Phase 6:** Edge cases and error handling (robustness)
7. **Phase 7:** Comprehensive testing with real photos

**Key principle:** Build incrementally, test photo display before animation complexity.

### Debugging tips:

- Add logging for photo lifecycle:
  ```typescript
  console.log(`Photo loading: ${event.name}`);
  console.log(`Photo displayed: ${event.name}`);
  console.log(`Photo transitioning to thumbnail`);
  console.log(`Thumbnail created at (${x}, ${y})`);
  ```

- Use browser DevTools Elements tab to inspect:
  - Photo overlay DOM structure
  - Thumbnail positioning (check left/top values)
  - CSS transforms during animation

- Add temporary borders to visualize positioning:
  ```css
  .photo-container { border: 2px solid red; }
  .photo-thumbnail { border: 2px solid blue; }
  ```

- Log transform calculations:
  ```typescript
  console.log(`Transform: translate(${translateX}px, ${translateY}px) scale(${scale})`);
  console.log(`Photo rect: ${photoRect.width}x${photoRect.height}`);
  ```

- Use Performance tab to verify smooth 60fps transitions

- Test with various photo URLs:
  - Valid photo
  - Missing photo (404)
  - Slow-loading photo
  - Invalid URL format

---

## Open Questions

1. **Auto-resume timing:** Spec mentions "Auto-resume after 2.5s OR wait for keypress". Prompt says manual keypress only. Which to implement?
   - **Decision:** Manual keypress only (matches prompt). Simpler for MVP, presenter controls pacing.

2. **Thumbnail size discrepancy:** Spec says 150×150px, prompt says 100×100px. Which size?
   - **Decision:** Use 100×100px (prompt takes precedence as most recent). Smaller thumbnails less obtrusive.

3. **Thumbnail position preference:** "Prefer above but do below if easier" - confirm above is acceptable?
   - **Decision:** Implement above (actually easier). Negative offset simpler than calculating below with label.

4. **Multiple photo events at same x-position:** Should we handle thumbnail overlap?
   - **Decision:** Accept overlap for MVP. Unlikely in real data (photo events typically spaced out).

5. **Photo loading spinner:** Should we show loading state while image loads?
   - **Decision:** Skip for MVP. Images should load quickly from local assets. Can add if needed.

---

**Document Status:** Ready for Review  
**Last Updated:** 2025-10-28  
**Next Step:** Review plan with user, then begin Phase 1 implementation

