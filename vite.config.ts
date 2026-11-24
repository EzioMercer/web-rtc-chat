import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Identifies this build: the commit on GitHub Actions, else the build time.
const version = process.env.GITHUB_SHA ?? String(Date.now());

// Publishes version.json next to the app, so an open tab can see that a newer build is out (src/core/update/).
const versionFile = (): Plugin => ({
  name: 'version-file',
  apply: 'build',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
  },
});

// Built files the worker doesn't keep: itself, the version check (always asked from the site), the page (kept as the
// app's address) and the picture only link previews use.
const NOT_KEPT = new Set(['sw.js', 'version.json', 'index.html', 'og-image.jpg']);

const listFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => (
  entry.isDirectory() ? listFiles(join(dir, entry.name)) : [join(dir, entry.name)]
));

// Writes the build's file list and version into the service worker (public/sw.js), so it keeps exactly these files
// and a new build is a new worker.
const workerFiles = (): Plugin => {
  let outDir = '';

  return {
    name: 'worker-files',
    apply: 'build',
    configResolved: (config) => {
      outDir = config.build.outDir;
    },
    closeBundle: () => {
      const files = listFiles(outDir)
        .map(file => relative(outDir, file).split('\\').join('/'))
        .filter(file => !NOT_KEPT.has(file))
        .sort();
      const worker = join(outDir, 'sw.js');
      const source = readFileSync(worker, 'utf8');
      const written = source
        .replace('const FILES = null;', `const FILES = ${JSON.stringify(files)};`)
        .replace('const VERSION = \'dev\';', `const VERSION = ${JSON.stringify(version)};`);

      if (written === source) {
        throw new Error('sw.js: FILES and VERSION not found');
      }

      writeFileSync(worker, written);
    },
  };
};

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/web-rtc-chat/
  base: '/web-rtc-chat/',
  plugins: [react(), versionFile(), workerFiles()],
  build: {
    rolldownOptions: {
      output: {
        // Big libraries in files of their own: their names (hashes) stay the same across app versions, so the worker
        // keeps them instead of downloading them again.
        codeSplitting: {
          groups: [
            { name: 'phone', test: /node_modules[\\/]libphonenumber-js/ },
            { name: 'flags', test: /node_modules[\\/]country-flag-icons/ },
          ],
        },
      },
    },
  },
  define: { __APP_VERSION__: JSON.stringify(version) },
});
