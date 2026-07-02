import type { Track } from "./types";

/**
 * Ordered playback queue with a "current" pointer. Emits a change event after
 * every mutation so the UI can re-render. The current track is tracked by
 * identity so reordering never loses your place.
 */
export class Queue {
  private items: Track[] = [];
  private index = -1;
  private readonly listeners = new Set<() => void>();

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  get tracks(): readonly Track[] {
    return this.items;
  }

  get currentIndex(): number {
    return this.index;
  }

  get current(): Track | undefined {
    return this.index >= 0 ? this.items[this.index] : undefined;
  }

  get length(): number {
    return this.items.length;
  }

  get hasNext(): boolean {
    return this.index < this.items.length - 1;
  }

  get hasPrev(): boolean {
    return this.index > 0;
  }

  add(track: Track): void {
    this.items.push(track);
    this.emit();
  }

  addMany(tracks: Track[]): void {
    if (tracks.length === 0) return;
    this.items.push(...tracks);
    this.emit();
  }

  removeAt(i: number): void {
    if (i < 0 || i >= this.items.length) return;
    const current = this.current;
    this.items.splice(i, 1);
    // Re-anchor the current pointer to the same track (or clamp if it was removed).
    if (current && current !== this.items[this.index]) {
      const found = this.items.indexOf(current);
      this.index = found;
    }
    if (this.index >= this.items.length) this.index = this.items.length - 1;
    this.emit();
  }

  clear(): void {
    this.items = [];
    this.index = -1;
    this.emit();
  }

  /** Moves the item at `from` to position `to`, preserving the current track. */
  move(from: number, to: number): void {
    if (from === to) return;
    if (from < 0 || from >= this.items.length) return;
    if (to < 0 || to >= this.items.length) return;
    const current = this.current;
    const [moved] = this.items.splice(from, 1);
    this.items.splice(to, 0, moved);
    if (current) this.index = this.items.indexOf(current);
    this.emit();
  }

  setCurrent(i: number): void {
    if (i < 0 || i >= this.items.length) return;
    this.index = i;
    this.emit();
  }

  /** Advances to the next track and returns it, or undefined at the end. */
  next(): Track | undefined {
    if (!this.hasNext) return undefined;
    this.index++;
    this.emit();
    return this.current;
  }

  /** Steps to the previous track and returns it, or undefined at the start. */
  prev(): Track | undefined {
    if (!this.hasPrev) return undefined;
    this.index--;
    this.emit();
    return this.current;
  }
}
