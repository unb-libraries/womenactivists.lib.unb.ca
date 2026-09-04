# womenactivists.lib.unb.ca

UNB Libraries' Electronic Text Centre presentation of *Women Social Activists of Atlantic
Canada* — biographical profiles of Atlantic Canadian elder women activists — a static
Nuxt 4 site with no backend, API, or database.

## Getting started

Copy `.env` values as needed first — `NUXT_PORT` and `NUXT_SITE_URI` drive the dev server's
host/port, public URL, and Vite HMR websocket (defaults to `localhost:3000` if unset).

### Run with Docker

Requires only [Docker](https://www.docker.com) — the container brings its own Node and pnpm.

```bash
docker compose up
```

This bind-mounts `app/`, `content/`, `public/`, `nuxt.config.ts`, `content.config.ts`,
`package.json`, and `pnpm-lock.yaml` into the container and runs `pnpm dev` inside it,
exposing `NUXT_PORT` (3085 by default) and its HMR websocket on `NUXT_PORT * 10` (30850).
Once you have pnpm on the host, `pnpm container:start` is the same command.

### Run locally

Requires [Node.js](https://nodejs.org) `^20.19 || >=22.12` (Vite 7's floor — the Docker
images use Node 26) and [pnpm](https://pnpm.io) 11.10.0.

```bash
pnpm install
pnpm dev
```

pnpm is most easily installed through Corepack, which picks up the version pinned by
`packageManager` in `package.json`:

```bash
corepack enable pnpm
```

### Configuration

Settings are defined in `nuxt.config.ts`. `NUXT_PORT` and `NUXT_SITE_URI` are read from
`.env` for local development; in production they're set directly as container environment
variables in the `Dockerfile`.

## Development

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build (SSR output) |
| `pnpm generate` | Static site generation — this is what the production Docker image uses |
| `pnpm preview` | Preview a production build locally |
| `pnpm migrate` | Re-run the one-off Drupal content migration (resumable, skips already-migrated pages) |
| `pnpm lint` / `pnpm lint:fix` | ESLint (`@antfu/eslint-config`) over the whole repo |

Husky git hooks enforce code quality on commit: `pre-commit` runs `lint-staged` (ESLint
`--fix` on staged files), `commit-msg` runs `commitlint` against the team's `JIRA-123
subject` header format (see `commitlint.config.ts`).

There is no test setup configured in this repo.

### Structure

- `app/pages/` — file-based routes: `index.vue`, `about/index.vue` + `about/[section].vue`,
  `bibliography.vue`, `activists/index.vue` (directory) + `activists/[slug]/index.vue`
  (bio) + `activists/[slug]/[section].vue`, `commentaries/index.vue` + `commentaries/[slug].vue`.
- `app/layouts/default.vue` — the single shell (header/nav, `<slot />`, footer).
- `app/components/` — `ActivistCard.vue`, `ProvinceFilter.vue`, and `SectionPager.vue` (a
  single generic prev/next/up pager shared by both the About and Activist section pages).
- `content/` — `@nuxt/content` v3 collections: `activists`, `activistSections`,
  `commentaries`, `about`, `aboutSections`, `pages` (bibliography). See `content.config.ts`
  and `CLAUDE.md` for the full content model — notably, each activist has her **own**
  ordered list of narrative sections (varying in count and naming), not a shared fixed set.
- `public/images/` — migrated portraits and supporting pictures.
- `scripts/migrate-content.mjs` — the one-off script that seeded `content/` and
  `public/images/` from the live Drupal site (`pnpm migrate`). Kept as provenance
  documentation, not part of the runtime build.

## Deployment

`.github/workflows/deployment-workflow.yaml` calls the shared pipeline in
[`unb-libraries/github-workflows`](https://github.com/unb-libraries/github-workflows):
build the image, push it to GHCR, then `kubectl set image` on the Kubernetes deployment.
Pull requests build and push only the immutable `<sha>-<timestamp>` tag; a push to `dev`
also tags `:dev` and deploys to the `dev` namespace as `dev-womenactivists.lib.unb.ca`.
The `prod` branch still holds the Drupal build and deploys prod on its own workflow.

The `Dockerfile`'s production path runs `pnpm generate` in a throw-away `build` stage and
serves the result from `ghcr.io/unb-libraries/nginx`, the standard UNB Libraries nginx
image. `docker/nginx/app.conf` replaces that image's own config — see its header for what
differs; in short, Nuxt's `try_files` (so a dead link is a real 404, not the home page with
a 200 status), the `/health` endpoint the Helm chart's probes require, gzip, and an
immutable long-cache for fingerprinted assets.

The build fails if the site is incomplete: `scripts/verify-generate.mjs` derives the
expected route set from `content/` and asserts every page was prerendered. This matters
because `nuxt generate` finds routes by crawling links, the home page's featured activists
are client-side only, and `nitro.prerender.failOnError` is `false`.

The Kubernetes side lives in `unb-libraries/kubernetes-metadata`:
`services/womenactivists.lib.unb.ca/02_frontend_nuxt/`, on the `unblib-daemon-nuxt-ssg`
chart. Because the site is generated statically, any change to pages or content requires a
rebuild — there is no server-side rendering at runtime.

## Entry points

- `/` — home page: 6 randomly featured activists (client-side pick) and a link to the
  full directory.
- `/about` — project background, with 10 further sub-pages (project origins, planning,
  interviewing, writing the profiles, acknowledgements, personal reflection, using the
  site, appendices, and two appendix sub-pages).
- `/activists` — directory of all 27 activists, with a province filter and pagination.
- `/activists/<slug>` — an activist's biography, with links to her own narrative sections.
- `/activists/<slug>/<section>` — one narrative section of an activist's biography.
- `/commentaries` — hub page for the 3 interpretive essays.
- `/commentaries/<slug>` — one commentary essay.
- `/bibliography` — the categorized bibliography.
