# Bill's Boat Care

http://billsboatcare.com/

# Build Tasks

Requires Node 22.22+ (run `npm install` first).

| Task              |                                                    |
|-------------------|----------------------------------------------------|
|`npm run dev`      | starts the Astro dev server with live reload        |
|`npm run build`    | builds to built folder                             |
|`npm run preview`  | serves the built folder locally to preview         |

# Deploy

Every push to `master` builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). In the repo's Settings → Pages, Source must be
"GitHub Actions".

# Stack

- [Astro](https://astro.build) for pages and components (`src/pages`, `src/components`, `src/layouts`)
- [Tailwind CSS v4](https://tailwindcss.com) + [daisyUI 5](https://daisyui.com) for styling; the `bbc` theme lives in `src/styles/global.css`
- [Lucide](https://lucide.dev/guide/packages/lucide-astro) icons via `@lucide/astro`
- Lora + Figtree fonts self-hosted via Fontsource
- Logo: `src/assets/logo.svg` (inlined in the header and used as the favicon); files served as-is, like the PNG favicon fallback, go in `public/`
