# Betriebsrichtung Frontend

The public web app for **Betriebsrichtung**, a small tool that shows how likely easterly operations are at Frankfurt Airport (EDDF), per time window (morning, afternoon, night), for the next 14 days and in the past.

The app is a single-page application (SPA) built with Vue 3, TypeScript, Vite and Tailwind CSS v4. It is served as static files by nginx in a container. All data comes from the Betriebsrichtung API, which is part of the Tobeworks API.

> **Disclaimer:** The app is not an official source. There is no guarantee. Forecasts are probabilities, not promises.

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Project structure](#project-structure)
- [Routing](#routing)
- [Data access](#data-access)
- [Design system](#design-system)
- [Accessibility](#accessibility)
- [Testing](#testing)
- [Build and container](#build-and-container)
- [Deployment](#deployment)
- [Content and legal pages](#content-and-legal-pages)
- [Known limitations](#known-limitations)
- [Related documentation](#related-documentation)
- [License](#license)

## Features

- **Timeline view** (`/`): forecasts per day and time window, with the probability and a plain-language classification ("eher West", "tendenziell Ost", …).
- **Method page** (`/methodik`): how the forecast is made, how to read the number, data sources and glossary.
- **Legal pages** (`/impressum`, `/datenschutz`) and a status page (`/status`, placeholder for now).
- **Mobile first:** bottom navigation on small screens, safe-area aware layout, touch targets of at least 2.75 rem.
- **No tracking:** no cookies, no analytics, no external fonts or scripts.

Planned but not yet built: statistics (`/statistik`), forecast quality (`/prognosegute`), the full timeline with details and sheets, and the status page. See [Known limitations](#known-limitations).

## Tech stack

| Area | Tool |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`), TypeScript in strict mode |
| Build | Vite 8 with `@vitejs/plugin-vue` |
| Routing | Vue Router 5 (history mode) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`), design tokens in `@theme` |
| Icons | `@lucide/vue` |
| Font | `@fontsource-variable/inter`, self-hosted |
| Tests | Vitest with jsdom and `@vue/test-utils` |
| Package manager | pnpm 11, pinned via `packageManager` |
| Container | `node:22-alpine` build stage, `nginx:alpine` runtime stage |

All dependencies are pinned to exact versions. Versions were chosen to be at least two weeks old at the time of selection.

## Quick start

Requirements: Node.js 22 or newer, and [Corepack](https://nodejs.org/api/corepack.html) (ships with Node) so the pinned pnpm version is used.

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open the URL printed by Vite (usually `http://localhost:5173`).

By default the dev server forwards `/betriebsrichtung/*` to the local API at `http://127.0.0.1:5001`. See [Configuration](#configuration) to change this.

## Configuration

The app reads these variables. Vite exposes only variables prefixed with `VITE_` to the browser code.

| Variable | Used by | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE` | build (browser code) | empty | Absolute API origin, for example `https://api.example.org`. Empty means same origin. Must be set at **build** time. |
| `VITE_API_PROXY` | dev server only | `http://127.0.0.1:5001` | Target of the dev-server proxy for `/betriebsrichtung`. |
| `VITE_BEISPIELDATEN` | build (browser code) | `false` | Set to `true` to show built-in sample data instead of calling the API. |

Create a local file `frontend/.env.local` (ignored by git) to override values for your machine:

```bash
VITE_API_PROXY=http://127.0.0.1:5001
VITE_BEISPIELDATEN=false
```

There is an example file `frontend/.env.example`.

Note: `VITE_API_BASE` is compiled into the bundle. Changing it requires a new build.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Vite dev server with hot reload and the API proxy. |
| `pnpm build` | Type-check with `vue-tsc`, then build the production bundle into `dist/`. |
| `pnpm typecheck` | Type-check only. |
| `pnpm test` | Run the Vitest test suite once. |
| `pnpm preview` | Serve the built `dist/` locally to check the production build. |

## Project structure

```
frontend/
  index.html               Entry document (title, description, canonical, Open Graph, JSON-LD, manifest)
  src/
    main.ts                Entry point: font, global styles, router, app mount
    App.vue                Layout: skip link, header, main, bottom navigation, footer
    router.ts              Routes, page titles, focus management after navigation
    env.d.ts               Global types (app version, route meta)
    styles/global.css      Design tokens (@theme), utility classes, base rules
    config/
      site.ts              Site name and airport
      texte.ts             All visible UI strings (German)
      methodik.ts          Method page content (German)
      rechtliches.ts       Impressum and Datenschutz content (German)
    api/
      client.ts            fetch wrapper: timeout, error normalization, base URL
      fixtures.ts          Sample timeline for offline development
      generated/           TypeScript types generated from schemas/betriebsrichtung/ (do not edit)
    composables/
      useZeitachse.ts     Loads the timeline, handles loading, error and sample modes
    lib/
      format.ts            Date and time formatting (Europe/Berlin)
      probability.ts       Percent formatting and wording of probability classes
      zeitachse.ts         Describes a timeline entry for display
    components/
      layout/              Navigation, footer icon, legal page layout, placeholder page
      timeline/            Timeline list
    pages/                 One component per route
  public/                  favicon.svg, manifest.webmanifest, robots.txt
  nginx.conf               Production server configuration
  Dockerfile               Multi-stage container build
```

Files in `src/api/generated/` are generated from the JSON schemas in `../schemas/betriebsrichtung/`. Do not edit them by hand. Regenerate them from the repository root with `python scripts/generate_types.py`.

## Routing

| Path | Page | Status |
|---|---|---|
| `/` | Timeline (forecast overview) | Basic list, full view planned |
| `/statistik` | Statistics | Placeholder |
| `/prognosegute` | Forecast quality | Placeholder |
| `/methodik` | Method | Complete |
| `/status` | Data status | Placeholder |
| `/impressum` | Legal notice | Complete |
| `/datenschutz` | Privacy policy | Complete |
| anything else | Not found | Complete |

The router sets the document title per page and moves the focus to the main heading after each navigation.

## Data access

- `src/api/client.ts` calls `GET /betriebsrichtung/v1/timeline?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- Requests time out after 10 seconds and can be cancelled when the user leaves the page.
- Errors are turned into `ApiFehler` objects with a machine-readable `code` (for example `NETZ_FEHLER`, `ZEITLIMIT`, or a code from the API) and a German message.
- The default range is the last 7 days up to 14 days ahead, in Berlin time.
- The frontend does **no** probability or window calculation. It only displays what the API returns.

## Design system

All colours, spacing and type come from tokens defined in `src/styles/global.css`. Components must not contain hex colours or raw colour classes such as `text-white` or `bg-gray-500`.

Main tokens:

| Token | Purpose |
|---|---|
| `background`, `foreground`, `muted`, `muted-foreground`, `border`, `surface` | Neutrals |
| `ring` | Focus ring |
| `west`, `west-fg` | Westbetrieb (lime) and its dark text colour |
| `east`, `east-fg` | Ostbetrieb (turquoise) and its dark text colour |
| `west-50` … `west-900`, `east-50` … `east-900` | Tints and shades derived with `color-mix` in OKLCH |
| `warning`, `warning-fg` | Warning alerts |
| `danger`, `danger-fg` | Error alerts |

Rules followed throughout:

- Sizes are in `rem`, not `px`. The hairline border utility uses `0.0625rem`.
- Colour is never the only signal. West and East are always labelled with text.
- No `<style>` blocks in components and no inline `style` attributes.
- Dark mode is not implemented yet, but the tokens are prepared for it.

Utility classes: `page-container`, `heading-page`, `heading-section`, `section-eyebrow`, `stat-number`, `text-fine`, `hairline`, `touch-target`, `pattern-estimated`.

## Accessibility

- Skip link to the main content as the first focusable element.
- `<main id="main-content">` and visible focus rings (`:focus-visible`).
- Focus moves to the page heading after navigation.
- Touch targets of at least 2.75 rem.
- Loading and error states use `aria-live` and `role="alert"`.
- Icons are decorative (`aria-hidden`) and always appear next to text.

## Testing

```bash
pnpm test
```

The suite covers:

- formatting of dates and times, including the switch to summer time
- probability wording and percent rounding, including the edge values
- description of timeline entries (observed, estimated, forecast, gap)
- the API client: success, API error codes and network errors
- the sample fixtures and the content of the legal and method pages
- the app shell: skip link, timeline loading, error state, not-found page, navigation, GitHub link

Tests run in jsdom. Vue components are mounted with `@vue/test-utils`.

## Build and container

Production build:

```bash
pnpm build
pnpm preview
```

Container (from the `frontend/` directory):

```bash
docker build --build-arg VITE_API_BASE=https://api.example.org -t betriebsrichtung-frontend .
docker run --rm -p 8080:80 betriebsrichtung-frontend
```

The image contains only the static build and nginx. The build stage installs dependencies with `pnpm install --frozen-lockfile`, so the lockfile must be up to date.

`nginx.conf` serves the SPA with these rules:

- `/assets/*` is cached for a year (`immutable`), because file names contain content hashes.
- Icons and the manifest are cached for a week.
- `index.html` is never cached.
- Unknown paths fall back to `index.html`, so the router decides what to show.
- gzip is enabled for text assets.
- Security headers: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

A Content Security Policy is not set yet. It needs the API origin, see [Known limitations](#known-limitations).

## Deployment

- The container image is built and pushed to GHCR by the GitHub Actions workflow `.github/workflows/images.yaml` on every push to `main`. The workflow reads the API origin from the repository variable `VITE_API_BASE`.
- The workflow can also be started by hand (`workflow_dispatch`) in the Actions tab.
- The Kubernetes manifests live in a separate infrastructure repository, managed with ArgoCD.
- The CI workflow `.github/workflows/frontend.yaml` runs type-checking, tests, the build and a Docker build on every change to `frontend/`.

## Content and legal pages

- Texts are kept in `src/config/` and `src/config/texte.ts`. They are in German, because the audience is German-speaking. Do not scatter strings across components.
- The method page explains the calculation in plain language and lists what is not modelled yet.
- The imprint and privacy policy describe what the app actually does: no cookies, no analytics, no forms, self-hosted font. If you add a feature that stores or sends data, update `src/config/rechtliches.ts` first.
- The app is indexable: no `noindex` meta tag, `robots.txt` allows everything and points to `sitemap.xml`. The sitemap lists only pages with their own content, so add a page there when a placeholder page gets real content.

## Known limitations

- Statistics, forecast quality and status pages are placeholders. The API endpoints for them are not built yet.
- The timeline shows only forecasts for now. Past windows need the slot job and an approved source for the actual operation direction.
- Probabilities are not yet calibrated against past results.
- No Content Security Policy yet, because the API origin depends on the deployment.
- No dark mode.
- The shadcn-vue component library is not used. Components are plain markup using the same tokens.
- The BugDrop feedback widget is not integrated.

## Related documentation

The repository contains more documentation in the `docs/` folder, one level above this directory:

- `docs/plan.md`: the complete project plan, including product and UX requirements
- `docs/frontend.md`: frontend notes and the mobile checklist
- `docs/api-konventionen.md`: API conventions
- `docs/jobs.md`: data jobs that feed the API
- `docs/generatoren.md`: how the TypeScript types and database migration are generated

## License

No licence file has been added yet, so the source code is not licensed for reuse. Data sources and their terms:

- Wind forecasts: [Open-Meteo](https://open-meteo.com), CC BY 4.0, free use for non-commercial purposes.
- Observed wind at the airport: METAR reports via [aviationweather.gov](https://aviationweather.gov).

Icons: GitHub logo from [Simple Icons](https://simpleicons.org) (CC0).
