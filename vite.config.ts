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

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/web-rtc-chat/
  base: '/web-rtc-chat/',
  plugins: [react(), versionFile()],
  define: { __APP_VERSION__: JSON.stringify(version) },
});
