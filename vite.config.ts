import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Replaces @lovable.dev/vite-tanstack-config for self-hosting: same plugin set
// (tanstackStart, tailwindcss, tsConfigPaths, viteReact), but nitro targets a
// plain Node server instead of Cloudflare Workers.
function keepEditorMarkersOutOfThreeScenes(): Plugin {
  return {
    name: "strip-editor-markers-from-three-scenes",
    enforce: "post",
    transform(code, id) {
      if (!id.includes("/src/components/games/") || !code.includes("data-tsd-source")) return null;
      if (!code.includes("@react-three/fiber") && !id.endsWith("MinhaCasa3D.tsx") && !id.endsWith("DetetiveBoard3D.tsx")) return null;

      return {
        code: code
          .replace(/"data-tsd-source":\s*"[^"]*",\s*/g, "")
          .replace(/,\s*"data-tsd-source":\s*"[^"]*"/g, "")
          .replace(/"data-tsd-source":\s*"[^"]*"/g, ""),
        map: null,
      };
    },
  };
}

export default defineConfig({
  css: { transformer: "lightningcss" },
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
    }),
    nitro({ preset: "node-server" }),
    viteReact(),
    keepEditorMarkersOutOfThreeScenes(),
  ],
});
