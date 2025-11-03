/**
 * FPS Counter
 * Displays frames-per-second performance metric in real-time
 * Must be fed frame timestamps from the actual application render loop
 */

export class FpsCounter {
  private container: HTMLDivElement;
  private frameCount: number = 0;
  private lastUpdateTime: number = performance.now();
  private fps: number = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'fps-counter';
    this.container.textContent = 'FPS: --';
    document.body.appendChild(this.container);
  }

  /**
   * Record a frame - should be called from the main application render loop
   * @param timestamp - Current frame timestamp from requestAnimationFrame
   */
  public recordFrame(timestamp: number): void {
    this.frameCount++;

    // Update FPS display every 500ms for smooth reading
    if (timestamp >= this.lastUpdateTime + 500) {
      this.fps = Math.round((this.frameCount * 1000) / (timestamp - this.lastUpdateTime));
      this.container.textContent = `FPS: ${this.fps}`;
      
      // Color-code based on performance
      if (this.fps >= 55) {
        this.container.style.color = '#22c55e'; // Green - good
      } else if (this.fps >= 30) {
        this.container.style.color = '#f59e0b'; // Orange - moderate
      } else {
        this.container.style.color = '#ef4444'; // Red - poor
      }

      this.frameCount = 0;
      this.lastUpdateTime = timestamp;
    }
  }

  /**
   * Reset the counter
   */
  public reset(): void {
    this.frameCount = 0;
    this.lastUpdateTime = performance.now();
    this.fps = 0;
  }

  /**
   * Remove the FPS counter from DOM
   */
  public destroy(): void {
    this.container.remove();
  }
}

