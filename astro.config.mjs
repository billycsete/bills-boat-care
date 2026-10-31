import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://billsboatcare.com',
  // Set by the deploy workflow when serving from a subpath (billycsete.github.io/bills-boat-care/)
  base: `${process.env.BASE_PATH ?? ''}/`,
  outDir: './built',
  vite: {
    plugins: [tailwindcss()],
  },
});
