# DirPassBuddy — MIDI Player

An installable **Progressive Web App** for playing MIDI files. Point it at a
folder on your machine, queue up songs, and change the playback speed on the
fly. Runs on **Windows** (Chrome/Edge) and **ChromeOS/Chromebook**, and works
offline once installed.

## Features

- 🎹 **Plays MIDI files** using a bundled General MIDI SoundFont
  ([GeneralUser GS](https://schristiancollins.com/generaluser.php)) via the
  [`spessasynth_lib`](https://github.com/spessasus/spessasynth_lib) synthesizer.
- 📁 **Sources from a local folder** using the File System Access API. The
  chosen folder is remembered across sessions (falls back to a folder upload on
  unsupported browsers).
- 📜 **Queue** — add songs, reorder them, remove them, and auto-advance to the
  next track when one finishes.
- ⏩ **Playback speed** from 0.25× to 2× (pitch preserved), with 0.5/1/1.5/2×
  presets.
- 🎛️ Transport controls, a scrubbable seek bar, volume, and a keyboard
  shortcut (Space = play/pause).
- 🔌 **Installable & offline-capable** PWA.
- 🎵 Load your **own SoundFont** (`.sf2` / `.sf3` / `.dls`) — saved for offline use.

## Getting started

```bash
npm install      # also fetches the default SoundFont (npm package `generaluser`)
npm run dev      # start the dev server, then open the printed URL in Chrome/Edge
```

Then:

1. Click **Open folder…** and choose a folder containing `.mid` / `.midi` files.
2. Add songs to the **Queue** (click a library row, or **Add all →**).
3. Press **▶** to play. Use the **Speed** slider/presets to change tempo.

### Build & preview the production PWA

```bash
npm run build    # type-check + bundle into dist/
npm run preview  # serve the built app; use the browser's "Install" action to add it
```

## How it works

| Concern | Where |
| --- | --- |
| Synthesis + sequencing (play/pause/seek/speed) | `src/player.ts` (wraps `spessasynth_lib`) |
| Folder access & MIDI file scanning | `src/library.ts` (File System Access API) |
| Queue state (order, current, next/prev) | `src/queue.ts` |
| UI wiring | `src/main.ts`, `index.html`, `src/style.css` |
| Persistence (folder handle, custom SoundFont) | `src/db.ts` (IndexedDB) |
| PWA manifest / service worker | `vite.config.ts` (`vite-plugin-pwa`) |

The default SoundFont is large, so it is **not committed to git**. It is copied
from the `generaluser` npm package into `public/soundfont.sf2` by
`scripts/copy-assets.mjs` (run automatically before `dev`/`build`). It is cached
at runtime by the service worker rather than precached, keeping installs light.

## Browser support

Full functionality (remembered folder) requires a Chromium browser
(Chrome/Edge/ChromeOS) with the File System Access API. Other browsers fall back
to a one-time folder upload.
