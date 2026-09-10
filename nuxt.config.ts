import { env } from 'node:process'
import tailwindcss from '@tailwindcss/vite'

const {
  NUXT_SITE_URI,
  NUXT_PORT,
} = env

// The GA4 property the Drupal site already reported to, so the switch to this build is
// continuous in Analytics rather than a new property starting from zero. A measurement id
// is public by design -- it ships in the page -- so it is not read from the environment.
//
// Unconditional, so dev-womenactivists.lib.unb.ca reports into the production property too:
// dev and prod run the same image and NUXT_SITE_URI is baked identically into both, so
// separating them needs a runtime location.hostname check or a GA4 internal-traffic filter.
// See README.md's "Analytics" section for the full Drupal migration record and its caveats.
const GA_MEASUREMENT_ID = 'G-BRFR77G20W'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/content'],
  content: {
    // Use Node's built-in node:sqlite (Node >= 22.5) rather than the default
    // better-sqlite3, which has no prebuilt binaries and would require a
    // python3/make/g++ toolchain in the Alpine image to compile from source.
    experimental: { sqliteConnector: 'native' },
    renderer: {
      // Content wraps every h2/h3/h4 in a self-link by default (its `renderer.anchorLinks`
      // becomes @nuxtjs/mdc's `headings.anchorLinks`). Nothing here links to a heading and
      // there is no visible anchor affordance, so it only produced headings that read and
      // style as links -- most visibly across the commentaries and the bibliography.
      anchorLinks: false,
    },
  },
  css: ['~/assets/css/main.css'],
  nitro: {
    prerender: {
      // A handful of activist bios and commentaries link to pages that are
      // already 404 on the live Drupal site (stale cross-references from an
      // old URL scheme, or to sections that were never published) — verified
      // against the live site rather than introduced by migration. Don't fail
      // the whole static build over content issues that predate this repo.
      failOnError: false,
      // An SSR build emits no 404 page unless asked; app.conf's error_page needs one.
      routes: ['/404.html'],
    },
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: [
        String(NUXT_SITE_URI),
      ],
      watch: {
        usePolling: true,
      },
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Women Social Activists of Atlantic Canada',
      titleTemplate: '%s | Women Social Activists of Atlantic Canada',
      meta: [
        {
          name: 'description',
          content: 'Biographical profiles of Atlantic Canadian elder women activists, documenting their work and the wisdom in their experiential learning. A UNB Libraries Electronic Text Centre project.',
        },
        { name: 'theme-color', content: '#8a629a' },
      ],
      link: [
        { rel: 'icon', type: 'image/vnd.microsoft.icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      // Prerendered into every page's head; there is no runtime server to inject it. This
      // fires once per document load, so every in-site navigation -- all client-side routing
      // -- is counted only by GA4 enhanced measurement's "page changes based on browser
      // history events" option on the data stream. Turning that off silently drops nearly
      // every pageview this site records, with nothing here to indicate why.
      script: [
        { src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`, async: true },
        {
          // allow_ad_personalization_signals mirrors what Drupal's google_analytics module
          // was already sending, so reporting behaviour does not change with the platform.
          innerHTML: 'window.dataLayer=window.dataLayer||[];'
            + 'function gtag(){dataLayer.push(arguments)}'
            + 'gtag("js",new Date());'
            + `gtag("config","${GA_MEASUREMENT_ID}",{allow_ad_personalization_signals:false});`,
        },
      ],
    },
  },
  $development: {
    devtools: { enabled: true },
    devServer: {
      host: '0.0.0.0',
      port: Number(NUXT_PORT),
    },
    vite: {
      server: {
        ws: {
          host: String(NUXT_SITE_URI),
          port: Number(NUXT_PORT) * 10,
        },
      },
    },
  },
})
