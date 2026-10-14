import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works at https://nys-cdo.github.io/demo-ctr-name-search/.
  base: './',
  build: {
    // NYSDS ships every component in one bundle; about 175 kB gzipped is expected here.
    chunkSizeWarningLimit: 800,
  },
});
