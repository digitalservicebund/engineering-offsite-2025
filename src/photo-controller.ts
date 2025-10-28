/**
 * PhotoController - Manages photo overlay display and thumbnail creation
 * Handles full-screen photo display with fade-in, photo-to-thumbnail transitions,
 * and persistent thumbnail management on the timeline.
 */

import type * as d3 from 'd3';
import type { Event, PhotoState } from './types';
import { LAYOUT } from './config';

export class PhotoController {
  private readonly overlayElement: HTMLElement;
  private readonly timelineContainer: HTMLElement;
  private readonly eventMarkerY: number;
  private readonly timelineWidth: number;

  private currentPhotoState: PhotoState | null = null;
  private thumbnails: Map<string, HTMLElement> = new Map(); // eventId → thumbnail element

  /**
   * Create a new PhotoController
   * @param overlayElement - The photo overlay HTML element
   * @param timelineContainer - The timeline container for positioning thumbnails
   * @param eventMarkerY - Y-position of events lane for thumbnail anchoring
   * @param timelineWidth - Total width of the timeline (for edge clamping)
   */
  constructor(
    overlayElement: HTMLElement,
    timelineContainer: HTMLElement,
    eventMarkerY: number,
    timelineWidth: number
  ) {
    this.overlayElement = overlayElement;
    this.timelineContainer = timelineContainer;
    this.eventMarkerY = eventMarkerY;
    this.timelineWidth = timelineWidth;

    console.log('✓ PhotoController initialized');
  }

  /**
   * Display a full-screen photo with fade-in animation
   * @param event - The event containing photo information
   * @param markerX - X-position of the event marker
   */
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
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
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

  /**
   * Hide the full-screen photo and create a thumbnail at the event marker position
   */
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

    // Calculate where thumbnail will appear on screen
    // Timeline container position + thumbnail position within container = screen position
    const containerRect = this.timelineContainer.getBoundingClientRect();
    const thumbnailScreenX = containerRect.left + thumbnailPos.x;
    const thumbnailScreenY = containerRect.top + thumbnailPos.y;

    // Calculate actual thumbnail dimensions based on natural image size
    // This ensures we match exactly what the browser will render
    const imgElement = photoElement as HTMLImageElement;
    const naturalAspectRatio = imgElement.naturalHeight / imgElement.naturalWidth;
    const actualThumbnailWidth = LAYOUT.photoDisplay.thumbnailSize;
    const actualThumbnailHeight = actualThumbnailWidth * naturalAspectRatio;

    // Calculate scale factor based on displayed size
    const scale = LAYOUT.photoDisplay.thumbnailSize / photoRect.width;

    // Calculate where thumbnail CENTER will be on screen
    const thumbnailCenterX = thumbnailScreenX + actualThumbnailWidth / 2;
    const thumbnailCenterY = thumbnailScreenY + actualThumbnailHeight / 2;

    // Get actual current photo center (not assumed screen center)
    // The photo may not be perfectly centered due to caption below it
    const currentPhotoCenterX = photoRect.left + photoRect.width / 2;
    const currentPhotoCenterY = photoRect.top + photoRect.height / 2;

    // Calculate translation: move photo center to thumbnail center
    const translateX = thumbnailCenterX - currentPhotoCenterX;
    const translateY = thumbnailCenterY - currentPhotoCenterY;

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
    await new Promise((resolve) => setTimeout(resolve, LAYOUT.photoDisplay.fadeOutDuration));

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

  /**
   * Check if there is currently an active photo being displayed
   * @returns true if a photo is in fullscreen or transitioning
   */
  public hasActivePhoto(): boolean {
    return (
      this.currentPhotoState !== null &&
      (this.currentPhotoState.phase === 'fullscreen' ||
        this.currentPhotoState.phase === 'transitioning')
    );
  }

  /**
   * Clean up all photos and thumbnails (for timeline reset)
   */
  public cleanup(): void {
    // Hide and remove overlay if active
    if (this.currentPhotoState) {
      this.overlayElement.classList.remove('visible');
      this.overlayElement.classList.add('hidden');
      this.currentPhotoState = null;
    }

    // Remove all thumbnails
    for (const [_eventId, thumbnail] of this.thumbnails) {
      thumbnail.remove();
    }
    this.thumbnails.clear();

    console.log('✓ PhotoController cleaned up');
  }

  /**
   * Calculate thumbnail position relative to event marker
   * @param markerX - X-position of event marker
   * @returns Object with x and y coordinates for thumbnail
   */
  private calculateThumbnailPosition(markerX: number): { x: number; y: number } {
    // Thumbnail centered horizontally on marker
    let x = markerX - LAYOUT.photoDisplay.thumbnailSize / 2;

    // Clamp x-position to prevent thumbnails from being clipped at timeline edges
    x = Math.max(0, Math.min(x, this.timelineWidth - LAYOUT.photoDisplay.thumbnailSize));

    // Thumbnail positioned BELOW marker line (to avoid obscuring event labels)
    // Position below the events lane bottom edge
    const laneBottomEdge = this.eventMarkerY + LAYOUT.lanes.events.strokeWidth / 2;
    const y = laneBottomEdge + LAYOUT.photoDisplay.thumbnailGapBelowLane;

    return { x, y };
  }

  /**
   * Convert existing photo element to thumbnail at calculated position
   * @param photoElement - The photo element to convert
   * @param eventId - Event ID for tracking
   * @param x - X-position for thumbnail
   * @param y - Y-position for thumbnail
   */
  private convertPhotoToThumbnail(
    photoElement: HTMLElement,
    eventId: string,
    x: number,
    y: number
  ): void {
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
    photoElement.style.height = 'auto'; // Maintain aspect ratio
    photoElement.style.maxHeight = `${LAYOUT.photoDisplay.thumbnailSize}px`; // Constrain height too
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
}

