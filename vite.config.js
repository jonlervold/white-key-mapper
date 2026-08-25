import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  base: "/wkm/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  plugins: [
    {
      name: "copy-examples",
      closeBundle() {
        const src = path.resolve("examples");
        const dest = path.resolve("dist/examples");
        fs.mkdirSync(dest, { recursive: true });
        for (const file of fs.readdirSync(src)) {
          fs.copyFileSync(path.join(src, file), path.join(dest, file));
        }
      },
    },
  ],
});
