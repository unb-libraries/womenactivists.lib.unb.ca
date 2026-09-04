# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A static Nuxt 4 site presenting the biographical profiles from "Women Social Activists of Atlantic Canada" (a UNB Libraries Electronic Text Centre project) for the UNB Libraries Electronic Text Centre. It replaces the Drupal site at womenactivists.lib.unb.ca. There is no backend, API, database, or state management at runtime — this is content, not an application. Content was migrated once from the live Drupal site via `scripts/migrate-content.mjs` (see below); it is not fetched live.

## Commands

Package manager is pnpm (`packageManager: pnpm@11.10.0`).

- `pnpm dev` — start dev server, using `NUXT_SITE_URI`/`NUXT_PORT` from `.env` for the public URL and allowed host (defaults to `localhost:3000` if unset)
- `pnpm build` — production build (SSR output)
- `pnpm generate` — static site generation (this is what the Docker production image uses)
- `pnpm preview` — preview a production build locally
- `pnpm migrate` — re-run the one-off Drupal content migration (`scripts/migrate-content.mjs`); skips any activist/commentary/about page whose output file already exists, so it's safe to re-run after a partial/interrupted run
- `pnpm lint` / `pnpm lint:fix` — ESLint (`@antfu/eslint-config`) over the whole repo
- `pnpm install` runs `nuxt prepare` via `postinstall` (`scripts/postinstall.mjs`), which
  **skips itself when `CI=true` or `NODE_ENV=production`**. That guard is what lets the
  Dockerfile install dependencies from the manifests alone, before copying `app/` and
  `content/`, so a content edit does not reinstall `node_modules`. `nuxt build`/`generate`
  runs prepare itself, so the image is unaffected.

There is no test setup configured in this repo. Linting and commit messages are enforced via Husky git hooks: `pre-commit` runs `lint-staged` (ESLint `--fix` on staged files), `commit-msg` runs `commitlint` against the team's `JIRA-123 subject` header format (see `commitlint.config.ts`), not Conventional Commits.

## Architecture

- **Nuxt 4 app directory layout**: source lives under `app/` (`app/layouts/`, `app/pages/`, `app/components/`, `app/utils/`, `app/assets/`).
- **Content model** (`@nuxt/content` v3, `content.config.ts`, source files under root-level `content/`):
  - `activists` — one entry per activist bio (`content/activists/<slug>/index.md`), route `/activists/<slug>`. Frontmatter includes `portrait`, `quote`, `province`, `summary` (the short directory teaser — **not** `excerpt`, which is a reserved `@nuxt/content` field that always resolves to `null`), `pictures[]`, and — importantly — `sections[]`: each activist's own ordered list of `{ slug, label }`. **Activists do NOT share a fixed set of narrative sections** — Drupal's Book-module outline for each one was hand-authored independently, so section count, slugs, and even spelling vary (e.g. "practicing" vs "practising", one combined "creating-change-lessons-skills-and-advice" section vs separate "key-achievements"/"lessons-learned"). Always read the section list from the activist's own frontmatter, never assume a fixed tuple.
  - `activistSections` — the narrative sections themselves (`content/activists/<slug>/NN.<section-slug>.md`), route `/activists/<slug>/<section-slug>`. Numeric filename prefixes control reading order; `content.config.ts` uses `source: { include: 'activists/*/*.md', exclude: ['activists/*/index.md'] }` to select these — a plain `[0-9]*.md` bracket-glob is **not** handled correctly by `@nuxt/content`'s matcher (confirmed during scaffolding; it mis-parses the bracket expression as a literal path segment), hence the include/exclude form.
  - `commentaries` — the 3 essays (`content/commentaries/NN.<slug>.md`), route `/commentaries/<slug>`.
  - `about` / `aboutSections` — same index+sections pattern as activists, but for the About outline (`content/about/index.md` + `content/about/NN.<section-slug>.md`), route `/about` and `/about/<section-slug>`. `aboutSections` uses the same include/exclude source pattern. Note "Appendices" has two further child pages in the live site's outline (`interview-guide`, `change-agent-strategies`) — flattened into `aboutSections` as ordinary entries (09, 10) rather than modeling another nesting level.
  - `pages` — currently just the bibliography (`content/pages/bibliography.md`). Its resolved content path is `/pages/bibliography` (the directory name is part of the path for a non-`index.md` file), so `app/pages/bibliography.vue` queries `queryCollection('pages').first()` rather than filtering by `.path()`.
- **Routing**: file-based via `app/pages/*.vue`, including dynamic routes `activists/[slug]/index.vue`, `activists/[slug]/[section].vue`, `about/[section].vue`, `commentaries/[slug].vue`. Components are explicitly imported (`import Foo from '~/components/Foo.vue'`) rather than relied upon via auto-import, matching the sibling `educationhistory.nuxt` repo's convention.
- **`SectionPager.vue`**: a single generic pager (props: `sections`, `basePath`, `currentSlug`, `upPath`, `upLabel`) used by both `about/[section].vue` and `activists/[slug]/[section].vue`. It computes prev/next from the *passed-in* ordered section list rather than querying `queryCollectionItemSurroundings` across a whole collection — that would leak across activist/section boundaries, since (unlike the sibling repo's single flat "book" collection) `activistSections` holds many independent per-activist sequences of varying length.
- **Home page featured activists**: `app/pages/index.vue` loads the full `activists` collection, then picks 6 at random **client-side only** (`onMounted` + `app/utils/shuffle.ts`), approximating the live site's per-request-random "Profiles of Wisdom" slideshow. The static-generated HTML itself has no featured picks baked in — they only appear after client hydration.
- **Styling**: Tailwind CSS v4 via the `@tailwindcss/vite` plugin (no `tailwind.config.js`). Theme tokens in `app/assets/css/main.css` under `@theme`, ported from the live site's Bootstrap theme: dark purple page/footer background (`--color-page: #2a0038`), medium-purple nav (`--color-nav: #976da5`), cream text (`--color-text: #fcfae6`), with distinct link/link-hover colors — this is a dark-themed site throughout, unlike `educationhistory.nuxt`'s light theme.
- **Static assets**: migrated portraits/pictures live under `public/images/activists/<slug>/` and `public/images/commentaries/`.

## Content migration

`scripts/migrate-content.mjs` is a one-off script (kept as provenance documentation, not part of the build) that scraped the live Drupal site once to seed `content/` and `public/images/`. Key things to know if it's ever re-run or extended:

- It's resumable: each activist/commentary/about-section writes its "done" marker file (`index.md` for activists/about, the numbered file for others) **last**, after all of its dependent fetches succeed, and the script skips anything whose marker file already exists. This mattered in practice — the live site rate-limits (`429`) under sustained request volume, and the script includes `Retry-After`-aware backoff plus request spacing, but resumability was still needed to complete the full 27-activist run.
- Per-activist sections are discovered from that activist's own bio-page outline nav (`nav[role="navigation"] > ul > li > a`), not assumed — see the `activists`/`activistSections` note above. The nav link's `href` is also used directly to fetch the section (its first path segment doesn't always match the activist's `/content/<slug>` slug — e.g. Betty Peterson's sections live under `/betty-peterson-aka-kukuminash/...`).
- Internal cross-links are rewritten during migration (`rewriteLinks()`): `/content/<slug>` → `/activists/<slug>`, and bare relative links like `href="may-bouchard"` (used inside commentary essay bodies) → `/activists/may-bouchard`, matched against the hard-coded list of 27 activist slugs.
- Province (used for the `/activists` directory filter) isn't present on an activist's own bio page — it's recorded in the script's `PROVINCE_BY_SLUG` map, derived once from fetching Drupal's `/activists?tid=1..4` taxonomy filter pages.

## Local development

- Copy `.env` values as needed — `NUXT_PORT` and `NUXT_SITE_URI` drive the dev server's host/port, public URL, and the Vite HMR websocket (which listens on `NUXT_PORT * 10`).
- `docker-compose.yml` runs the `development` target of the `Dockerfile` (bind-mounting `app/`, `content/`, `public/`, config, and `.nuxt`) and runs `pnpm dev` inside the container, exposing `NUXT_PORT` (3085 by default) and its HMR websocket port (30850) — use `pnpm container:start` for this.

## Deployment

- **CI**: `.github/workflows/deployment-workflow.yaml` calls
  `unb-libraries/github-workflows/.github/workflows/build-push-deploy-notify.yaml@1.x` —
  build → push to GHCR → `kubectl set image` → prune → Slack. That repo replaced the
  reusable workflows that used to live in the deprecated `unb-libraries/dockworker`
  composer package; nothing in the pipeline runs PHP. Triggers are `push` on `dev` only
  (plus `pull_request` and `workflow_dispatch`) rather than the fleet's bare `on: push`,
  which double-builds any push with an open PR.
- Two tags per build: the immutable `<short-sha>-<timestamp>`, which is what the deploy
  pins, and the mutable branch tag (`:dev`), which is only what the Helm chart names for a
  cold start.
- **`Dockerfile`**: `base` is pure toolchain (no `COPY`, so it stays cached); `build` copies
  `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` and installs *before* copying the
  rest, so editing `content/` does not reinstall `node_modules`; the final stage is
  `ghcr.io/unb-libraries/nuxt-ssg:3.23.x` with `.output/public` copied into `$APP_WEBROOT`.
- **The nginx config lives in the base image**
  ([docker-nuxt-ssg](https://github.com/unb-libraries/docker-nuxt-ssg)), not here: Nuxt's
  `try_files`, gzip, the asset cache, and — load-bearing — `location = /health`, which the
  `unblib-daemon-nuxt-ssg` chart's probes hit. Do not go back to plain `nginx:alpine`; the
  chart's `robotsTxtAppend`/`robotsTxtReplace` values are also inert without the
  `pre-init.d` scripts this image inherits.
- **`scripts/verify-generate.mjs`** runs in the build stage and fails the build if any page
  implied by `content/` was not prerendered (155 at time of writing). This is the guard for
  the crawl-coverage hazard: `nuxt generate` discovers routes by crawling links, the home
  page's featured-activists list renders client-side only, and
  `nitro.prerender.failOnError` is `false` — so an incomplete site would otherwise build
  green. It also cross-checks each activist's `sections[]` frontmatter against her section
  filenames. If you remove the `/activists` directory links or a bio's own section list,
  this is what will tell you.
- Because the site is generated statically, any change to pages/content requires a rebuild
  (`pnpm generate`) to take effect in the production image — there is no server-side
  rendering at runtime in production.
- **Kubernetes**: `unb-libraries/kubernetes-metadata`,
  `services/womenactivists.lib.unb.ca/02_frontend_nuxt/`, chart `unblib-daemon-nuxt-ssg`.
  The Helm release name is the URI and the namespace separates environments. `dev` serves
  `dev-womenactivists.lib.unb.ca`. The `prod` branch still holds the Drupal build and
  deploys the `unblib-daemon-drupal` component, so the service runs two charts across its
  two namespaces — `acts.lib.unb.ca` is the precedent for that.
