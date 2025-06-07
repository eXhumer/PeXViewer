import { defineConfig } from 'vite';
import { join } from 'node:path';

// https://vitejs.dev/config
export default defineConfig({
  base: '/main_window/',
  root: join(__dirname, 'src', 'main_window'),
  build: {
    outDir: join(__dirname, '.vite', 'build', 'main_window'),
  },
});
