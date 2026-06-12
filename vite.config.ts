// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Deploy target is Vercel, not Cloudflare: disable the bundled Cloudflare
  // build plugin and let Nitro emit Vercel's Build Output (.vercel/output),
  // which Vercel auto-detects. See Vercel docs: /docs/frameworks/full-stack/tanstack-start
  cloudflare: false,
  plugins: [nitro()],
  vite: {
    optimizeDeps: {
      include: ["qrcode.react", "html5-qrcode"],
    },
  },
});
