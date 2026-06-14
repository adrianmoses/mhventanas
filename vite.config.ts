import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

// The web app (004) lives under src/app/ alongside the existing src/db, src/ingest,
// src/media node modules. Point TanStack Start's router at that subtree rather than
// the default src/routes so the app layer stays self-contained.
//
// The nitro() plugin compiles the SSR fetch handler into a runnable server output
// (.output/server/index.mjs), so the app can be hosted on a plain Node service
// instance via `node .output/server/index.mjs`.
export default defineConfig({
  plugins: [
    tanstackStart({
      router: {
        entry: "app/router.tsx",
        routesDirectory: "app/routes",
        generatedRouteTree: "app/routeTree.gen.ts",
      },
    }),
    nitro(),
    react(),
  ],
});
