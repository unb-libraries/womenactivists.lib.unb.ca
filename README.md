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
serves the result from
[`ghcr.io/unb-libraries/nuxt-ssg`](https://github.com/unb-libraries/docker-nuxt-ssg), which
carries the nginx configuration for a generated Nuxt site: Nuxt's `try_files` (so a dead link
is a real 404, not the home page with a 200 status), the `/health` endpoint the Helm chart's
probes require, gzip, and an immutable long-cache for fingerprinted assets.

The build fails if the site is incomplete: `scripts/verify-generate.mjs` derives the
expected route set from `content/` and asserts every page was prerendered. This matters
because `nuxt generate` finds routes by crawling links, the home page's featured activists
are client-side only, and `nitro.prerender.failOnError` is `false`.

The Kubernetes side lives in `unb-libraries/kubernetes-metadata`:
`services/womenactivists.lib.unb.ca/02_frontend_nuxt/`, on the `unblib-daemon-nuxt-ssg`
chart. Because the site is generated statically, any change to pages or content requires a
rebuild — there is no server-side rendering at runtime.

## Analytics

The site reports to Google Analytics 4 property **`G-BRFR77G20W`** — the same property the
Drupal site used, so the platform switch does not split the history into a before and an
after. The whole implementation is the stock gtag snippet inlined in `app.head.script` in
`nuxt.config.ts`; there is no analytics module, no runtime config, and no `.env` value. A
GA4 measurement id ships in the page anyway, so it is a constant (`GA_MEASUREMENT_ID`) at
the top of `nuxt.config.ts` rather than a secret.

`nuxt generate` prerenders it into the `<head>` of every page, `404.html` included.

### What Drupal was sending

For reference, the Drupal site (`google_analytics` contrib module) emitted:

```js
gtag("js", new Date());
gtag("set", "developer_id.dMDhkMT", true);
gtag("config", "G-BRFR77G20W", {
  "groups": "default",
  "allow_ad_personalization_signals": false,
  "page_location": location.pathname + location.search + location.hash
});
```

and configured the module's own click handlers via `drupal-settings-json`:
`trackOutbound`, `trackMailto`, `trackDownload` (against a long file-extension list), and
`trackUrlFragments`.

### What carried over, and what did not

| Drupal behaviour | In this build | Why |
| --- | --- | --- |
| Property `G-BRFR77G20W` | Kept | Continuous history across the platform switch. |
| `allow_ad_personalization_signals: false` | Kept | Reporting behaviour should not change with the platform. |
| `developer_id.dMDhkMT` | Dropped | Google's identifier for the Drupal module; it only told Google which CMS emitted the hit. |
| `groups: "default"` | Dropped | gtag's default group — the explicit value was a no-op. |
| `page_location` override | Dropped | See "page_location semantics" below. |
| `trackOutbound` | Dropped, mostly covered | GA4 enhanced measurement fires an outbound-click event natively. |
| `trackDownload` + extension list | Dropped, mostly covered | GA4 enhanced measurement fires `file_download` natively, against **its own** extension list. |
| `trackMailto` | Dropped, **not** covered | No native GA4 equivalent — see below. |

### Caveats

Four things behave differently than they did under Drupal. None of them is a bug in the
snippet; all four are worth knowing before anyone reads a report and concludes traffic
changed when the platform did.

**1. In-site navigation depends on a GA4 setting, not on this code.** The snippet fires
once per document load. Everything after that — bio → section → next section, which is most
of the reading on this site — is Nuxt client-side routing, which loads no new document.
Those views are counted only because GA4 enhanced measurement listens for `pushState` /
`popState` / `replaceState` and synthesises a `page_view`. That is the *Page changes based
on browser history events* option, under Enhanced measurement → Page views → advanced, on
the web data stream. It is enabled by default and Drupal never depended on it, because
Drupal served a real document per click. **If someone ever turns it off, this site silently
loses almost all of its pageviews and nothing in this repo will indicate why.** If session
or pageview counts ever look implausibly flat, check that setting before suspecting the
snippet.

**2. The dev environment reports into the production property.** The measurement id is
hardcoded and there is no hostname guard, so `dev-womenactivists.lib.unb.ca` sends hits to
`G-BRFR77G20W` alongside production. This is unresolved and needs a decision. Note that it
cannot be fixed with a build-time environment variable: `NUXT_SITE_URI` is set to
`womenactivists.lib.unb.ca` in the `Dockerfile`'s base stage and dev and prod run the *same
image*, differing only in Kubernetes namespace and ingress. The two real options are a
runtime `location.hostname` check around the snippet, or a GA4-side *Define internal
traffic* rule plus the internal-traffic filter on the data stream.

**3. `page_location` semantics changed.** Drupal overrode `page_location` with
`location.pathname + location.search + location.hash` — a *relative* path, and one that
deliberately included the fragment (`trackUrlFragments`). This build sends no override, so
gtag reports the full absolute URL. Historical rows and new rows therefore describe the
same page differently, which matters for any saved report, exploration, or audience that
matches on a literal `page_location` value. It also means fragment-only navigation is no
longer distinguished.

**4. `mailto:` clicks are no longer counted.** GA4's enhanced measurement outbound-click
event covers links leading to another *domain*; a `mailto:` link is not an http(s)
navigation and does not qualify. Drupal's `trackMailto` had no GA4 native equivalent, so
this signal is simply gone. Nothing else in the migration lost a signal outright — if
anyone was reporting on mail-link engagement, this is the one to raise.

### Verifying it after a deploy

Because the site is static, analytics changes ship only on rebuild.

```bash
# The tag is prerendered, so it is greppable in the build output
grep -rl 'G-BRFR77G20W' .output/public --include='*.html' | wc -l
```

That count should equal the number of generated HTML files. In the browser, GA4 Realtime
should show the initial load *and* a further pageview for each in-site link click — the
second half is what confirms caveat 1 is actually working on this property.


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
