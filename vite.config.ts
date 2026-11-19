import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves the site from https://<user>.github.io/web-rtc-chat/
  base: '/web-rtc-chat/',
  plugins: [react()],
});
