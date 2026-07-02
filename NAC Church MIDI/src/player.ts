import { WorkletSynthesizer, Sequencer } from "spessasynth_lib";
import { kvGet, KEY_SOUNDFONT } from "./db";

const WORKLET_URL = `${import.meta.env.BASE_URL}spessasynth_processor.min.js`;
const DEFAULT_SOUNDFONT_URL = `${import.meta.env.BASE_URL}soundfont.sf2`;

/** Thrown by {@link MidiPlayer.init} when no SoundFont could be loaded. */
export class NoSoundFontError extends Error {
  constructor() {
    super("No SoundFont available");
    this.name = "NoSoundFontError";
  }
}

export interface PlayerCallbacks {
  /** The current song reached its end (used to advance the queue). */
  onSongEnded?: () => void;
  /** Fired ~60x/sec while playing with the current and total time in seconds. */
  onTimeUpdate?: (current: number, duration: number) => void;
  /** Fired whenever playback starts or stops. */
  onPlayStateChange?: (playing: boolean) => void;
}

/**
 * Wraps the spessasynth WorkletSynthesizer + Sequencer into a small, app-shaped
 * API: load a MIDI buffer, play/pause/seek, and change playback speed. One
 * instance is reused for the whole session; songs are swapped in via load().
 */
export class MidiPlayer {
  private ctx?: AudioContext;
  private synth?: WorkletSynthesizer;
  private seq?: Sequencer;
  private gain?: GainNode;
  private clock = 0;
  private speed = 1;
  private volume = 1;
  private hasSong = false;
  private ready = false;
  private readonly cb: PlayerCallbacks;

  constructor(cb: PlayerCallbacks = {}) {
    this.cb = cb;
  }

  get isReady(): boolean {
    return this.ready;
  }

  /** Builds the audio graph and loads the SoundFont. Call once. */
  async init(soundfont?: ArrayBuffer): Promise<void> {
    const ctx = new AudioContext();
    await ctx.audioWorklet.addModule(WORKLET_URL);

    const synth = new WorkletSynthesizer(ctx);
    const gain = ctx.createGain();
    gain.gain.value = this.volume;
    synth.connect(gain);
    gain.connect(ctx.destination);

    const sf = soundfont ?? (await this.resolveSoundFont());
    await synth.soundBankManager.addSoundBank(sf, "main");
    await synth.isReady;

    const seq = new Sequencer(synth, { skipToFirstNoteOn: true });
    seq.loopCount = 0; // play through once so `songEnded` fires
    seq.playbackRate = this.speed;
    seq.eventHandler.addEvent("songEnded", "queue-advance", () => {
      this.stopClock();
      this.cb.onPlayStateChange?.(false);
      this.cb.onSongEnded?.();
    });

    this.ctx = ctx;
    this.synth = synth;
    this.gain = gain;
    this.seq = seq;
    this.ready = true;
  }

  /** Resolves the SoundFont: a user override in IndexedDB, else the bundled default. */
  private async resolveSoundFont(): Promise<ArrayBuffer> {
    const override = await kvGet<ArrayBuffer>(KEY_SOUNDFONT);
    if (override) return override;
    const res = await fetch(DEFAULT_SOUNDFONT_URL);
    if (!res.ok) throw new NoSoundFontError();
    return res.arrayBuffer();
  }

  /** Replaces the active SoundFont without rebuilding the audio graph. */
  async setSoundFont(buffer: ArrayBuffer): Promise<void> {
    if (!this.synth) throw new Error("Player not initialized");
    await this.synth.soundBankManager.deleteSoundBank("main").catch(() => {});
    // addSoundBank detaches the buffer, so clone it for the caller/persistence.
    await this.synth.soundBankManager.addSoundBank(buffer.slice(0), "main");
    await this.synth.isReady;
  }

  /** Loads a MIDI file and (by default) starts playing it. */
  async load(buffer: ArrayBuffer, fileName: string, autoplay = true): Promise<void> {
    if (!this.seq || !this.ctx) throw new Error("Player not initialized");
    this.seq.loadNewSongList([{ binary: buffer, fileName }]);
    this.seq.playbackRate = this.speed;
    this.hasSong = true;
    if (autoplay) {
      await this.play();
    } else {
      this.seq.pause();
      this.cb.onPlayStateChange?.(false);
    }
  }

  /** Starts/resumes playback. Returns false if no song is loaded yet. */
  async play(): Promise<boolean> {
    if (!this.seq || !this.ctx || !this.hasSong) return false;
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.seq.play();
    this.startClock();
    this.cb.onPlayStateChange?.(true);
    return true;
  }

  pause(): void {
    if (!this.seq) return;
    this.seq.pause();
    this.stopClock();
    this.cb.onPlayStateChange?.(false);
  }

  togglePlay(): Promise<boolean> | void {
    if (!this.seq) return;
    return this.seq.paused ? this.play() : (this.pause(), undefined);
  }

  get playing(): boolean {
    return !!this.seq && !this.seq.paused && this.hasSong;
  }

  /** Seeks to a time in seconds. */
  seek(seconds: number): void {
    if (!this.seq) return;
    this.seq.currentTime = Math.max(0, Math.min(seconds, this.duration));
    this.emitTime();
  }

  get duration(): number {
    return this.seq?.duration ?? 0;
  }

  get currentTime(): number {
    return this.seq?.currentHighResolutionTime ?? 0;
  }

  /** Sets playback speed (1 = normal). Pitch is preserved by the synth. */
  setSpeed(rate: number): void {
    this.speed = rate;
    if (this.seq) this.seq.playbackRate = rate;
  }

  get speedValue(): number {
    return this.speed;
  }

  /** Sets output volume in the 0..1 range. */
  setVolume(v: number): void {
    this.volume = v;
    if (this.gain) this.gain.gain.value = v;
  }

  private startClock(): void {
    this.stopClock();
    const tick = () => {
      this.emitTime();
      this.clock = requestAnimationFrame(tick);
    };
    this.clock = requestAnimationFrame(tick);
  }

  private stopClock(): void {
    if (this.clock) cancelAnimationFrame(this.clock);
    this.clock = 0;
  }

  private emitTime(): void {
    this.cb.onTimeUpdate?.(this.currentTime, this.duration);
  }
}
