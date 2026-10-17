# Bill's Boat Care

Marketing site for Bill's Boat Care (boat maintenance, Santa Barbara, CA), live at https://billsboatcare.com. A small static site; the only client-side JavaScript is the footer water effect.

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
- Component frontmatter runs at build time only. For example, the copyright year in `Footer.astro` is the build year.
- Use scoped `<style>` blocks only for things Tailwind can't express well, such as hiding the footer's fallback waves once WebGL starts.

### Tailwind CSS v4 + daisyUI 5 (`src/styles/global.css`)
- Tailwind v4 is configured in CSS. There is no `tailwind.config.js` or PostCSS config: Tailwind runs through the `@tailwindcss/vite` plugin.
- daisyUI's built-in themes are off (`themes: false`). The single custom theme `bbc` is defined with `@plugin 'daisyui/theme'`. Change brand colors there (`--color-primary`, etc.), not in components.
- Custom design tokens (fonts `font-sans`/`font-display`) live in the `@theme` block.
- Prefer daisyUI component classes (`btn btn-primary`, `card`, etc.) plus Tailwind utilities over custom CSS.
- `global.css` is imported once, in `src/layouts/Layout.astro`.

### Lucide icons (`@lucide/astro`)
- Import named icons: `import { Mail, Phone } from '@lucide/astro';` then `<Mail size={18} aria-hidden="true" />`.
- Icons render as inline SVG at build time, so they add no runtime JavaScript.
- Icon names: https://lucide.dev/icons/

### Fonts
Self-hosted via Fontsource and imported in `global.css`: Lora Variable (`font-display`, used for h1–h3 and blockquotes) and Figtree Variable (`font-sans`, body).

### Photos
`PhotoSlot.astro` renders a polaroid-style frame. Without a `src` it shows a striped placeholder labeled with the `alt` text. To add a real photo, put the file in `public/images/photos/` and pass `src="/images/photos/<file>"`.

### Footer water (`src/scripts/water.ts`)
- `Footer.astro` loads it in a bundled `<script>`; it draws three wave layers on a WebGL canvas behind the footer content.
- Ambient swell is summed Gerstner waves in the vertex shader; each layer also runs its own 1D wave-equation simulation on the CPU (`Surface`). Only a pointer in the air above the water pushes on it, measured from the highest visible wave: nothing within `GAP` px, then each layer reacts in its own band around `Layer.trigger` (back line highest, front line lowest), so the lines respond one after another. Pointers on or in the water do nothing, and force only ever presses down. Strength is set by `MOVE_FORCE`, `WAKE_FORCE` and `TAP_FORCE`.
- Layer colors, resting heights and wave settings are in the `LAYERS` array. The front surface rests 110px from the top of the footer and is clamped so it never reaches the text (`pt-44`); keep those in sync.
- It pauses offscreen, freezes the ambient swell under `prefers-reduced-motion`, and leaves the static SVG fallback waves in place if WebGL is unavailable.

### Logo
- `src/assets/logo.svg` is the color logo (transparent background). Import it as an Astro SVG component (`import Logo from '../assets/logo.svg'`) so it's inlined; `Layout.astro` also imports it with `?url` for the favicon. Astro writes an unused copy of the file into `built/_astro/` for the component import; that is expected.
- Inlined, its colors can be overridden with CSS custom properties: `--logo-sail` (mainsail and top of the jib), `--logo-jib-mid`, `--logo-jib-low`, `--logo-hull`. Recoloring doesn't work when it's loaded through `<img>`.
- `public/images/logo-mono.svg` is a single-color version that uses `currentColor`.
- The SVG uses fixed IDs (`jib`, `jib-top`, …), so inline it only once per page.
- `public/images/logo.png` is kept as a PNG favicon fallback.

## Layout

```
src/
  layouts/Layout.astro      <html>/<head>, meta tags, global CSS
  pages/index.astro         the single page: composes the section components in order
  components/               one component per section (SiteHeader, Hero, Intro, Services,
                            Credentials, Gallery, Quote, Footer, MobileCallBar)
    PhotoSlot.astro         photo frame with placeholder fallback
  scripts/water.ts          WebGL water simulation used by Footer.astro
  data/site.ts              name, email, phone, area (use these, don't hard-code contact details)
  assets/logo.svg           color logo (inlined in the header, favicon)
  styles/global.css         Tailwind, fonts, daisyUI plugin + bbc theme, @theme tokens
public/images/              logo-mono.svg, logo.png fallback favicon (served as-is)
docs/content-outline.md     content inventory; source of truth for site copy
```

## Conventions

- Keep copy changes consistent with `docs/content-outline.md`, and update it when the content changes.
