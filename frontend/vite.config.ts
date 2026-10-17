import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { loadEnv, type ProxyOptions } from "vite";
import { defineConfig } from "vitest/config";

const paket = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf-8")) as { version: string };

// Nur im Dev-Server: Die API cached 5 Minuten, das verdeckt neu gerechnete Werte nach einem lokalen Joblauf.
const keinCache: NonNullable<ProxyOptions["configure"]> = (proxy) => {
  proxy.on("proxyRes", (antwort) => {
    antwort.headers["cache-control"] = "no-store";
  });
};

export default defineConfig(({ mode }) => {
  const umgebung = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [vue(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(paket.version),
    },
    server: {
      proxy: {
        "/betriebsrichtung": {
          target: umgebung.VITE_API_PROXY || "http://127.0.0.1:5001",
          changeOrigin: true,
          configure: keinCache,
        },
      },
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.ts"],
    },
  };
});
