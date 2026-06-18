import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

export default defineConfig({
  entry: { 'cli/index': 'src/cli/index.ts' },
  format: ['esm'],
  target: 'node20',
  shims: false,
  clean: true,
  dts: true,
  banner: { js: '#!/usr/bin/env node' },
  plugins: [
    {
      name: 'copy-hooks',
      buildEnd() {
        const srcDir = path.resolve('src/hooks');
        const dstDir = path.resolve('dist/hooks');
        if (!fs.existsSync(srcDir)) return;
        fs.mkdirSync(dstDir, { recursive: true });
        for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
          if (entry.isFile()) {
            fs.copyFileSync(path.join(srcDir, entry.name), path.join(dstDir, entry.name));
          }
        }
      },
    },
  ],
});
