/** A MIDI file discovered in the user's chosen folder. */
export interface Track {
  /** Stable unique id (folder-relative path). */
  id: string;
  /** Display name (file name without extension). */
  name: string;
  /** Folder-relative path, used as a subtitle and for sorting. */
  path: string;
  /** Reads the file's bytes on demand (abstracts FS Access handles vs. File). */
  read: () => Promise<ArrayBuffer>;
}
