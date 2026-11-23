import { sites } from "@openai/sites-vite-plugin";
import vinext from "vinext";
import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import hostingConfig from "./.openai/hosting.json";
import { packageDashboardBridge } from "./scripts/package-dashboard-bridge.mjs";
import { projectPortsBridge } from "./scripts/project-ports-bridge.mjs";
import { testSiteBridge } from "./scripts/test-site-bridge.mjs";
import { motionExportBridge } from "./scripts/motion-export-bridge.mjs";
import { swiftUIPreviewBridge } from "./scripts/swiftui-preview-bridge.mjs";
import { sharedStylesBridge } from "./scripts/shared-styles-bridge.mjs";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;
const governanceRoot = fileURLToPath(new URL("../workspace-governance/", import.meta.url));

// macOS Seatbelt blocks FSEvents, so Codex previews need polling for HMR.
const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

// Vinext's normal config hook restores permissive localhost CORS for its dev server.
// Apply the Studio same-origin policy after framework config has been merged.
const studioDevCorsPolicy: Plugin = {
  name: "acm-studio-dev-cors-policy",
  enforce: "post",
  config: () => ({ server: { cors: false } }),
};

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    resolve: { dedupe: ["react", "react-dom"] },
    worker: { format: "es" as const },
    server: {
      ...(isCodexSeatbeltSandbox ? { watch: { useFsEvents: false, usePolling: true } } : {}),
      // The Studio UI is same-origin; do not grant other localhost apps CORS access to Vite's file route.
      cors: false,
      // The canonical guide is imported by the Studio UI; CORS above prevents other origins reading allowed files.
      fs: { allow: [process.cwd(), governanceRoot], deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "**/work/**"] },
    },
    plugins: [
      sharedStylesBridge(),
      swiftUIPreviewBridge(),
      motionExportBridge(),
      projectPortsBridge(),
      packageDashboardBridge(),
      testSiteBridge(),
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
      studioDevCorsPolicy,
    ],
  };
});
