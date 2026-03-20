// nexvett-ai-client/vite.config.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vike(), react(), tailwindcss()],
  ssr: {
    noExternal: [/@nexvett-ai\/shared/],
  },
  server: {
    proxy: {
      "/api/agents": {
        target: "http://localhost:4111",
        changeOrigin: true,
      },
      "/api": {
        target: "http://localhost:4111",
        changeOrigin: true,
      },
    },
  },
});
