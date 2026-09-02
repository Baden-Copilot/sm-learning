import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        port: 24679,
        clientPort: 24679,
      },
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // `data/**` and `public/uploads/**` are runtime JSON/asset stores written by the
      // Express API on every progress/quiz/session save. Watching them makes Vite fire a
      // full-reload on each save, which resets the learner back to the first lesson.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: [
          '**/data/**',
          '**/public/uploads/**',
        ],
      },
      allowedHosts: ['sm-learning.djalu.co.id'],
    },
  };
});