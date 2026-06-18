import { defineConfig } from 'tsup';
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8')) as {
  version: string;
};

export default defineConfig({
  entry: { 'cli/index': 'src/cli/index.ts' },
  format: ['esm'],
  target: 'node20',
  shims: false,
  clean: true,
  outExtension: () => ({ js: '.js' }),
  banner: { js: '#!/usr/bin/env node' },
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
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
            fs.chmodSync(path.join(dstDir, entry.name), 0o755);
          }
        }
        // Make the bundled CLI executable. The shebang is in the source, but
        // tsup doesn't preserve the +x bit on the output, and npm's tarball
        // preserves whatever permissions we set here.
        const cliOut = path.resolve('dist/cli/index.js');
        if (fs.existsSync(cliOut)) fs.chmodSync(cliOut, 0o755);
      },
    },
  ],
});
