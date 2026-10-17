# Bill's Boat Care

http://billsboatcare.com/

# Build Tasks

Requires Node 22.22+ (run `npm install` first).

| Task              |                                                    |
|-------------------|----------------------------------------------------|
|`npm run dev`      | starts the Astro dev server with live reload        |
|`npm run build`    | builds to built folder                             |
|`npm run preview`  | serves the built folder locally to preview         |

# Stack

- [Astro](https://astro.build) for pages and components (`src/pages`, `src/components`, `src/layouts`)
- [Tailwind CSS v4](https://tailwindcss.com) + [daisyUI 5](https://daisyui.com) for styling; the `bbc` theme lives in `src/styles/global.css`
- [Lucide](https://lucide.dev/guide/packages/lucide-astro) icons via `@lucide/astro`
- Static files (logo/favicon) go in `public/`
