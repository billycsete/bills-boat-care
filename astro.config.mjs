import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://billsboatcare.com',
  outDir: './built',
  vite: {
    plugins: [tailwindcss()],
  },
});
