# Bill's Boat Care

Marketing site for Bill's Boat Care (boat maintenance, Santa Barbara, CA), live at https://billsboatcare.com. A small static site with no client-side JavaScript.

## Commands

Requires Node 22.22+ (Astro 7 minimum).

- `npm run dev`: dev server at http://localhost:4321 with live reload
- `npm run build`: static build into `built/`
- `npm run preview`: serve `built/` locally

There are no tests or linter. Verify changes with `npm run build` and by viewing the page.

## Stack

### Astro 7 (`astro.config.mjs`)
- Static output (`outDir: './built'`). The `built/` folder is committed to git, so rebuild before committing a change you want to ship.
- `site` is set to `https://billsboatcare.com` and feeds `Astro.site` (used for `og:url`).
- Component frontmatter runs at build time only. For example, the copyright year in `Ocean.astro` is the build year.
- Use scoped `<style>` blocks only for things Tailwind can't express well, such as the wave keyframes in `Ocean.astro`.

### Tailwind CSS v4 + daisyUI 5 (`src/styles/global.css`)
- Tailwind v4 is configured in CSS. There is no `tailwind.config.js` or PostCSS config: Tailwind runs through the `@tailwindcss/vite` plugin.
- daisyUI's built-in themes are off (`themes: false`). The single custom theme `bbc` is defined with `@plugin 'daisyui/theme'`. Change brand colors there (`--color-primary`, etc.), not in components.
- Custom design tokens (fonts `font-sans`/`font-display`, wave colors `bg-wave-*`) live in the `@theme` block.
- Prefer daisyUI component classes (`btn btn-primary`, `card`, etc.) plus Tailwind utilities over custom CSS.
- `global.css` is imported once, in `src/layouts/Layout.astro`.

### Lucide icons (`@lucide/astro`)
- Import named icons: `import { Mail, Phone } from '@lucide/astro';` then `<Mail size={18} aria-hidden="true" />`.
- Icons render as inline SVG at build time, so they add no runtime JavaScript.
- Icon names: https://lucide.dev/icons/

### Fonts
Lato 700 (display) and Open Sans 300 (body) load from Google Fonts in `Layout.astro`.

## Layout

```
src/
  layouts/Layout.astro      <html>/<head>, meta tags, fonts, global CSS
  pages/index.astro         the single page (header content)
  components/
    Services.astro          services list (data array in frontmatter)
    ContactButtons.astro    email + phone buttons
    Ocean.astro             animated waves + footer
  styles/global.css         Tailwind, daisyUI plugin + bbc theme, @theme tokens
public/images/logo.png      logo + favicon (served as-is)
docs/content-outline.md     content inventory; source of truth for site copy
```

## Conventions

- Keep copy changes consistent with `docs/content-outline.md`, and update it when the content changes.
