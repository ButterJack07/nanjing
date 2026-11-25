import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const page = name => fileURLToPath(new URL(name, import.meta.url));

// Relative base keeps assets working both locally and on GitHub Pages project sites.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: page('index.html'),
        planning: page('planning.html'),
        planningXianlin: page('planning-xianlin.html'),
      },
    },
  },
});
