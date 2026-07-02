// Copies the runtime engine assets into `public/` so Vite can serve them:
//   - the GeneralUser GS SoundFont (from the `generaluser` npm package)
//   - the spessasynth AudioWorklet processor (from `spessasynth_lib`)
//
// Both are (re)generated on `npm run dev` / `npm run build` via the
// predev/prebuild hooks, so a fresh `npm install` + build always works even
// though the large SoundFont is git-ignored.
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {[string, string][]} */
const assets = [
  [
    resolve(root, "node_modules/generaluser/GeneralUser.sf2"),
    resolve(root, "public/soundfont.sf2"),
  ],
  [
    resolve(root, "node_modules/spessasynth_lib/dist/spessasynth_processor.min.js"),
    resolve(root, "public/spessasynth_processor.min.js"),
  ],
];

for (const [src, dest] of assets) {
  if (!existsSync(src)) {
    console.error(
      `[copy-assets] missing source: ${src}\n` +
        `Run \`npm install\` first so the dependency assets are available.`,
    );
    process.exit(1);
  }
  // Skip the copy if the destination is already up to date (same size).
  if (existsSync(dest) && statSync(dest).size === statSync(src).size) continue;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`[copy-assets] ${src} -> ${dest}`);
}
