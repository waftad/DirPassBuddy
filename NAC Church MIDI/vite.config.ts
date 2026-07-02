import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// The bundled SoundFont is large, so it is NOT precached. Instead it is cached
// at runtime (CacheFirst) the first time it loads, which keeps the install
// lightweight while still enabling fully offline playback afterwards.
export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icons/icon.svg"],
      manifest: {
        name: "DirPassBuddy MIDI Player",
        short_name: "MIDI Player",
        description:
          "Play MIDI files from a local folder, queue songs, and change playback speed.",
        theme_color: "#111827",
        background_color: "#111827",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        // Do not precache the SoundFont or the demo MIDIs; cache them at runtime.
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        globIgnores: ["**/soundfont.sf2", "**/spessasynth_processor.min.js"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            // The SoundFont and the AudioWorklet processor: cache on first use.
            urlPattern: ({ url }) =>
              url.pathname.endsWith("/soundfont.sf2") ||
              url.pathname.endsWith("/spessasynth_processor.min.js"),
            handler: "CacheFirst",
            options: {
              cacheName: "midi-engine",
              expiration: { maxEntries: 4 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        // Allow testing the installed/offline behaviour during `vite dev`.
        enabled: false,
      },
    }),
  ],
});
