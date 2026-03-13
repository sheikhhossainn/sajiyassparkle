// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readdirSync } from 'fs';

// Helper to find all HTML files in frontend/pages
const pagesDir = resolve(__dirname, 'frontend/pages');
const pages = readdirSync(pagesDir)
  .filter((file) => file.endsWith('.html'))
  .reduce((acc, file) => {
    const name = file.replace('.html', '');
    acc[name] = resolve(pagesDir, file);
    return acc;
  }, {});

export default defineConfig({
  root: 'frontend',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/index.html'),
        ...pages
      },
    },
  },
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
});
