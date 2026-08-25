import { defineConfig, loadEnv, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig(async ({ mode }): Promise<UserConfig> => {
  const plugins: any[] = [react(), tailwindcss()];
  try {
    // @ts-ignore
    const m = await import("./.vite-source-tags.js");
    plugins.push(m.sourceTags());
  } catch {}

  const env = loadEnv(mode, process.cwd(), ["VITE_", "NEXT_PUBLIC_"]);
  const processEnvDefines: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    processEnvDefines[`process.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins,
    envPrefix: ["VITE_", "NEXT_PUBLIC_"],
    define: processEnvDefines,
    server: {
      host: "0.0.0.0",
      // During local dev, forward /api calls to the Express server
      // (run `npm run dev:all` to start both, or `npm run dev:server` separately).
      proxy: {
        "/api": {
          target: "http://localhost:3002",
          changeOrigin: true,
        },
      },
    },
  };
});
