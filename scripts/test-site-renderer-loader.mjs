import path from "node:path";
import { runnerImport } from "vite";

/** The dev gateway's renderer graph, including raw CSS and linked ACM packages. */
export function createTestSiteRendererLoader({ root, watcher, importRenderer = runnerImport }) {
  const entry = path.join(root, "app/studio/test-site/render.tsx");
  let loaded;
  let dependencies = new Set();
  const invalidate = file => { if (dependencies.has(file)) loaded = undefined; };
  watcher.on("change", invalidate);
  return {
    load() {
      if (loaded) return loaded;
      const pending = Promise.resolve().then(() => importRenderer(entry, {
        root,
        // Vite's inline server environment needs buildStart to initialise its CSS cache.
        server: { perEnvironmentStartEndDuringDev: true },
        resolve: { dedupe: ["react", "react-dom"] },
        environments: { inline: { resolve: { noExternal: [/^@acm\//] } } },
        esbuild: { jsx: "automatic" },
      })).then(result => {
        if (loaded === pending) {
          dependencies = new Set([entry, ...result.dependencies]);
          watcher.add([...dependencies]);
        }
        return result.module;
      }).catch(error => {
        // A stale failure must not clear a replacement import started after invalidation.
        if (loaded === pending) loaded = undefined;
        throw error;
      });
      loaded = pending;
      return pending;
    },
    close() { watcher.off("change", invalidate); },
  };
}
