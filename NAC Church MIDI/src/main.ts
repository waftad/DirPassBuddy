import "./style.css";
import { registerSW } from "virtual:pwa-register";
import type { Track } from "./types";
import { Queue } from "./queue";
import { MidiPlayer, NoSoundFontError } from "./player";
import {
  directoryPickerSupported,
  pickFolder,
  savedFolder,
  scanFolder,
  hasPermission,
  requestPermission,
  tracksFromFileList,
} from "./library";
import { kvSet, KEY_SOUNDFONT, KEY_SOUNDFONT_NAME } from "./db";

// Keep the installed PWA up to date in the background.
registerSW({ immediate: true });

// --- DOM helpers ------------------------------------------------------------
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

const els = {
  openFolder: $<HTMLButtonElement>("open-folder"),
  changeSoundfont: $<HTMLButtonElement>("change-soundfont"),
  folderInput: $<HTMLInputElement>("folder-input"),
  soundfontInput: $<HTMLInputElement>("soundfont-input"),
  libraryList: $<HTMLUListElement>("library-list"),
  libraryEmpty: $<HTMLParagraphElement>("library-empty"),
  libraryCount: $<HTMLSpanElement>("library-count"),
  libraryFilter: $<HTMLInputElement>("library-filter"),
  addAll: $<HTMLButtonElement>("add-all"),
  queueList: $<HTMLUListElement>("queue-list"),
  queueEmpty: $<HTMLParagraphElement>("queue-empty"),
  queueCount: $<HTMLSpanElement>("queue-count"),
  clearQueue: $<HTMLButtonElement>("clear-queue"),
  npTitle: $<HTMLDivElement>("np-title"),
  npSub: $<HTMLDivElement>("np-sub"),
  prev: $<HTMLButtonElement>("prev"),
  playpause: $<HTMLButtonElement>("playpause"),
  next: $<HTMLButtonElement>("next"),
  seek: $<HTMLInputElement>("seek"),
  timeCurrent: $<HTMLSpanElement>("time-current"),
  timeTotal: $<HTMLSpanElement>("time-total"),
  speed: $<HTMLInputElement>("speed"),
  speedValue: $<HTMLElement>("speed-value"),
  volume: $<HTMLInputElement>("volume"),
  toast: $<HTMLDivElement>("toast"),
};

function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

let toastTimer = 0;
function toast(message: string): void {
  els.toast.textContent = message;
  els.toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (els.toast.hidden = true), 3200);
}

// --- State ------------------------------------------------------------------
const queue = new Queue();
const player = new MidiPlayer({
  onSongEnded: handleSongEnded,
  onTimeUpdate: updateSeek,
  onPlayStateChange: updatePlayButton,
});

let libraryTracks: Track[] = [];
let loadedTrackId: string | undefined;
let initPromise: Promise<void> | undefined;
let seeking = false;
// A saved folder that needs a permission re-grant (from a user gesture).
let pendingFolder: FileSystemDirectoryHandle | undefined;

// --- Engine bootstrap (deferred until the first user gesture) ---------------
async function ensurePlayer(): Promise<boolean> {
  if (player.isReady) return true;
  if (!initPromise) {
    toast("Loading sound engine…");
    initPromise = player
      .init()
      .then(() => {
        player.setSpeed(parseFloat(els.speed.value));
        player.setVolume(parseFloat(els.volume.value));
      })
      .catch((err) => {
        initPromise = undefined; // allow retry
        if (err instanceof NoSoundFontError) {
          toast("No SoundFont found — load one to enable playback.");
          els.soundfontInput.click();
        } else {
          console.error(err);
          toast("Could not start the sound engine.");
        }
        throw err;
      });
  }
  try {
    await initPromise;
    return true;
  } catch {
    return false;
  }
}

// --- Playback ---------------------------------------------------------------
async function loadCurrent(autoplay: boolean): Promise<void> {
  const track = queue.current;
  if (!track) return;
  if (!(await ensurePlayer())) return;
  try {
    const buffer = await track.read();
    await player.load(buffer, track.name, autoplay);
    loadedTrackId = track.id;
    updateNowPlaying();
  } catch (err) {
    console.error(err);
    toast(`Couldn't read "${track.name}".`);
  }
}

async function playIndex(i: number): Promise<void> {
  queue.setCurrent(i);
  await loadCurrent(true);
}

function handleSongEnded(): void {
  if (queue.next()) {
    void loadCurrent(true);
  } else {
    updatePlayButton(false);
  }
}

async function onPlayPause(): Promise<void> {
  if (queue.length === 0) return;
  const current = queue.current;
  if (current && loadedTrackId === current.id && player.isReady) {
    await player.togglePlay();
    return;
  }
  if (queue.currentIndex < 0) queue.setCurrent(0);
  await loadCurrent(true);
}

async function onPrev(): Promise<void> {
  if (player.currentTime > 3) {
    player.seek(0);
    return;
  }
  if (queue.prev()) await loadCurrent(true);
}

async function onNext(): Promise<void> {
  if (queue.next()) await loadCurrent(true);
}

// --- Rendering --------------------------------------------------------------
function renderLibrary(): void {
  const filter = els.libraryFilter.value.trim().toLowerCase();
  const shown = filter
    ? libraryTracks.filter((t) => t.path.toLowerCase().includes(filter))
    : libraryTracks;

  els.libraryList.replaceChildren(
    ...shown.map((track) => {
      const li = document.createElement("li");
      li.className = "row";
      li.title = "Add to queue";

      const info = document.createElement("div");
      info.className = "row-info";
      const name = document.createElement("span");
      name.className = "row-name";
      name.textContent = track.name;
      const sub = document.createElement("span");
      sub.className = "row-sub muted";
      sub.textContent = track.path;
      info.append(name, sub);

      const add = document.createElement("button");
      add.className = "icon-btn ghost";
      add.textContent = "＋";
      add.title = "Add to queue";

      const addToQueue = () => queue.add(track);
      li.addEventListener("click", addToQueue);
      li.append(info, add);
      return li;
    }),
  );

  const has = libraryTracks.length > 0;
  els.libraryEmpty.hidden = has;
  els.libraryCount.textContent = has ? `${libraryTracks.length} files` : "";
  els.addAll.disabled = shown.length === 0;
}

function renderQueue(): void {
  els.queueList.replaceChildren(
    ...queue.tracks.map((track, i) => {
      const li = document.createElement("li");
      li.className = "row queue-row";
      if (i === queue.currentIndex) li.classList.add("current");
      li.title = "Play";

      const info = document.createElement("div");
      info.className = "row-info";
      const name = document.createElement("span");
      name.className = "row-name";
      name.textContent = track.name;
      const sub = document.createElement("span");
      sub.className = "row-sub muted";
      sub.textContent = i === queue.currentIndex ? "Now playing" : track.path;
      info.append(name, sub);
      info.addEventListener("click", () => void playIndex(i));

      const controls = document.createElement("div");
      controls.className = "row-controls";
      controls.append(
        iconButton("↑", "Move up", i === 0, () => queue.move(i, i - 1)),
        iconButton("↓", "Move down", i === queue.length - 1, () => queue.move(i, i + 1)),
        iconButton("✕", "Remove", false, () => queue.removeAt(i)),
      );

      li.append(info, controls);
      return li;
    }),
  );

  const has = queue.length > 0;
  els.queueEmpty.hidden = has;
  els.queueCount.textContent = has ? `${queue.length} songs` : "";
  els.clearQueue.disabled = !has;

  els.playpause.disabled = !has;
  els.prev.disabled = !has;
  els.next.disabled = !queue.hasNext;
  updateNowPlaying();
}

function iconButton(
  label: string,
  title: string,
  disabled: boolean,
  onClick: () => void,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.className = "icon-btn ghost small";
  b.textContent = label;
  b.title = title;
  b.disabled = disabled;
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

function updateNowPlaying(): void {
  const t = queue.current;
  els.npTitle.textContent = t ? t.name : "Nothing playing";
  els.npSub.textContent = t ? t.path : "";
}

function updatePlayButton(playing: boolean): void {
  els.playpause.textContent = playing ? "⏸" : "▶";
  els.playpause.title = playing ? "Pause" : "Play";
  els.playpause.classList.toggle("playing", playing);
}

function updateSeek(current: number, duration: number): void {
  els.timeCurrent.textContent = formatTime(current);
  els.timeTotal.textContent = formatTime(duration);
  els.seek.disabled = duration <= 0;
  if (!seeking && duration > 0) {
    els.seek.value = String((current / duration) * 1000);
  }
}

// --- Folder & SoundFont -----------------------------------------------------
async function openFolder(): Promise<void> {
  // If a saved folder is awaiting a permission re-grant, handle that first.
  if (pendingFolder) {
    const dir = pendingFolder;
    pendingFolder = undefined;
    els.openFolder.textContent = "Open folder…";
    if (await requestPermission(dir)) {
      await loadFolder(dir);
    } else {
      toast("Folder access was denied.");
    }
    return;
  }

  if (!directoryPickerSupported()) {
    els.folderInput.click();
    return;
  }

  try {
    const dir = await pickFolder();
    await loadFolder(dir);
  } catch (err) {
    if ((err as DOMException)?.name !== "AbortError") {
      console.error(err);
      toast("Couldn't open that folder.");
    }
  }
}

async function loadFolder(dir: FileSystemDirectoryHandle): Promise<void> {
  libraryTracks = await scanFolder(dir);
  els.libraryFilter.value = "";
  renderLibrary();
  toast(
    libraryTracks.length > 0
      ? `Found ${libraryTracks.length} MIDI file${libraryTracks.length === 1 ? "" : "s"}.`
      : "No MIDI files found in that folder.",
  );
}

async function restoreSavedFolder(): Promise<void> {
  if (!directoryPickerSupported()) return;
  const dir = await savedFolder();
  if (!dir) return;
  if (await hasPermission(dir)) {
    await loadFolder(dir);
  } else {
    // Chromium requires a user gesture to re-grant permission after a reload.
    pendingFolder = dir;
    els.openFolder.textContent = `Reconnect "${dir.name}"`;
  }
}

async function onSoundFontChosen(file: File): Promise<void> {
  try {
    const buffer = await file.arrayBuffer();
    await kvSet(KEY_SOUNDFONT, buffer.slice(0));
    await kvSet(KEY_SOUNDFONT_NAME, file.name);
    if (player.isReady) {
      await player.setSoundFont(buffer);
      toast(`SoundFont set: ${file.name}`);
    } else {
      initPromise = undefined; // will be picked up on next play
      toast(`SoundFont saved: ${file.name}`);
    }
  } catch (err) {
    console.error(err);
    toast("That SoundFont couldn't be loaded.");
  }
}

// --- Wiring -----------------------------------------------------------------
queue.onChange(renderQueue);

els.openFolder.addEventListener("click", () => void openFolder());
els.folderInput.addEventListener("change", () => {
  if (els.folderInput.files) {
    libraryTracks = tracksFromFileList(els.folderInput.files);
    els.libraryFilter.value = "";
    renderLibrary();
    toast(`Found ${libraryTracks.length} MIDI files.`);
  }
});

els.changeSoundfont.addEventListener("click", () => els.soundfontInput.click());
els.soundfontInput.addEventListener("change", () => {
  const file = els.soundfontInput.files?.[0];
  if (file) void onSoundFontChosen(file);
  els.soundfontInput.value = "";
});

els.libraryFilter.addEventListener("input", renderLibrary);
els.addAll.addEventListener("click", () => {
  const filter = els.libraryFilter.value.trim().toLowerCase();
  const toAdd = filter
    ? libraryTracks.filter((t) => t.path.toLowerCase().includes(filter))
    : libraryTracks;
  queue.addMany(toAdd);
});
els.clearQueue.addEventListener("click", () => {
  queue.clear();
  loadedTrackId = undefined;
});

els.playpause.addEventListener("click", () => void onPlayPause());
els.prev.addEventListener("click", () => void onPrev());
els.next.addEventListener("click", () => void onNext());

els.seek.addEventListener("input", () => {
  seeking = true;
  const frac = Number(els.seek.value) / 1000;
  els.timeCurrent.textContent = formatTime(frac * player.duration);
});
els.seek.addEventListener("change", () => {
  const frac = Number(els.seek.value) / 1000;
  player.seek(frac * player.duration);
  seeking = false;
});

function applySpeed(value: number): void {
  const clamped = Math.min(2, Math.max(0.25, value));
  els.speed.value = String(clamped);
  els.speedValue.textContent = `${clamped.toFixed(2)}×`;
  player.setSpeed(clamped);
  for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip")) {
    chip.classList.toggle("active", Number(chip.dataset.speed) === clamped);
  }
}
els.speed.addEventListener("input", () => applySpeed(Number(els.speed.value)));
for (const chip of document.querySelectorAll<HTMLButtonElement>(".chip")) {
  chip.addEventListener("click", () => applySpeed(Number(chip.dataset.speed)));
}

els.volume.addEventListener("input", () => player.setVolume(Number(els.volume.value)));

// Keyboard: space toggles play/pause (unless typing in the filter box).
window.addEventListener("keydown", (e) => {
  if (e.code === "Space" && e.target !== els.libraryFilter) {
    e.preventDefault();
    void onPlayPause();
  }
});

// --- Init -------------------------------------------------------------------
applySpeed(1);
renderLibrary();
renderQueue();
void restoreSavedFolder();
