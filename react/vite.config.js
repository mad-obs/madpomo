import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* Cloudflare Pages: build command `npm run build`, output directory `dist`.
   Vite is here to compile JSX and split the views into their own chunks —
   the data still lives in localStorage, there is no backend. */
export default defineConfig({
  plugins: [react()],
  // style.css and tokens.css live one level up, shared with the plain build
  server: { fs: { allow: [".."] } },
  base: "./",
  build: {
    outDir: "dist"
  }
});
