import type { Track } from "./types";
import { kvGet, kvSet, kvDelete, KEY_DIR_HANDLE } from "./db";

const MIDI_RE = /\.midi?$/i;

function isMidi(name: string): boolean {
  return MIDI_RE.test(name);
}

function displayName(fileName: string): string {
  return fileName.replace(MIDI_RE, "");
}

/** True when the browser supports picking a folder via the File System Access API. */
export function directoryPickerSupported(): boolean {
  return typeof window.showDirectoryPicker === "function";
}

/** Recursively collects MIDI files from a directory handle, sorted by path. */
async function scan(
  dir: FileSystemDirectoryHandle,
  prefix = "",
): Promise<Track[]> {
  const tracks: Track[] = [];
  for await (const entry of dir.values()) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.kind === "file") {
      if (!isMidi(entry.name)) continue;
      const handle = entry as FileSystemFileHandle;
      tracks.push({
        id: path,
        name: displayName(entry.name),
        path,
        read: async () => (await handle.getFile()).arrayBuffer(),
      });
    } else {
      tracks.push(...(await scan(entry as FileSystemDirectoryHandle, path)));
    }
  }
  return tracks;
}

/** Scans an already-authorized directory handle for MIDI files. */
export function scanFolder(dir: FileSystemDirectoryHandle): Promise<Track[]> {
  return scan(dir);
}

/** Shows the folder picker, persists the chosen handle, and returns it. */
export async function pickFolder(): Promise<FileSystemDirectoryHandle> {
  const dir = await window.showDirectoryPicker!({ id: "midi-library", mode: "read" });
  await kvSet(KEY_DIR_HANDLE, dir);
  return dir;
}

/** Returns the previously chosen folder handle, if any. */
export function savedFolder(): Promise<FileSystemDirectoryHandle | undefined> {
  return kvGet<FileSystemDirectoryHandle>(KEY_DIR_HANDLE);
}

export function forgetFolder(): Promise<unknown> {
  return kvDelete(KEY_DIR_HANDLE);
}

/** Whether read permission for a saved handle is still granted (no prompt). */
export async function hasPermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  if (!dir.queryPermission) return true;
  return (await dir.queryPermission({ mode: "read" })) === "granted";
}

/** Requests read permission for a saved handle (must be called from a user gesture). */
export async function requestPermission(dir: FileSystemDirectoryHandle): Promise<boolean> {
  if (!dir.requestPermission) return true;
  return (await dir.requestPermission({ mode: "read" })) === "granted";
}

/**
 * Fallback for browsers without the File System Access API: builds tracks from
 * the FileList produced by an `<input webkitdirectory>` element. These tracks
 * cannot be persisted across sessions.
 */
export function tracksFromFileList(files: FileList): Track[] {
  const tracks: Track[] = [];
  for (const file of Array.from(files)) {
    if (!isMidi(file.name)) continue;
    const path = file.webkitRelativePath || file.name;
    tracks.push({
      id: path,
      name: displayName(file.name),
      path,
      read: () => file.arrayBuffer(),
    });
  }
  tracks.sort((a, b) => a.path.localeCompare(b.path));
  return tracks;
}
