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
  private readonly xScale: d3.ScaleTime<number, number>;
  private readonly eventMarkerY: number;

  private currentPhotoState: PhotoState | null = null;
  private thumbnails: Map<string, HTMLElement> = new Map(); // eventId → thumbnail element

  /**
   * Create a new PhotoController
   * @param overlayElement - The photo overlay HTML element
   * @param timelineContainer - The timeline container for positioning thumbnails
   * @param xScale - D3 time scale for x-position calculations
   * @param eventMarkerY - Y-position of events lane for thumbnail anchoring
   */
  constructor(
    overlayElement: HTMLElement,
    timelineContainer: HTMLElement,
    xScale: d3.ScaleTime<number, number>,
    eventMarkerY: number
  ) {
    this.overlayElement = overlayElement;
    this.timelineContainer = timelineContainer;
    this.xScale = xScale;
    this.eventMarkerY = eventMarkerY;

    console.log('✓ PhotoController initialized');
    
    // Suppress unused warnings for properties/methods used in future tasks
    void this.xScale;
    void this.calculateThumbnailPosition;
    void this.convertPhotoToThumbnail;
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
    // Implementation in Phase 4
    console.log('hidePhotoAndCreateThumbnail called');
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
   * Note: Will be used in Phase 4 for photo-to-thumbnail transition
   */
  private calculateThumbnailPosition(markerX: number): { x: number; y: number } {
    // Thumbnail centered horizontally on marker
    const x = markerX - LAYOUT.photoDisplay.thumbnailSize / 2;

    // Thumbnail positioned above marker line
    const y =
      this.eventMarkerY +
      LAYOUT.photoDisplay.thumbnailOffsetY -
      LAYOUT.photoDisplay.thumbnailSize;

    return { x, y };
  }

  /**
   * Convert existing photo element to thumbnail at calculated position
   * @param photoElement - The photo element to convert
   * @param eventId - Event ID for tracking
   * @param x - X-position for thumbnail
   * @param y - Y-position for thumbnail
   * Note: Will be used in Phase 4 for photo-to-thumbnail transition
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
}

