import { env } from 'node:process'
import tailwindcss from '@tailwindcss/vite'

const {
  NUXT_SITE_URI,
  NUXT_PORT,
} = env

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/content'],
  content: {
    // Use Node's built-in node:sqlite (Node >= 22.5) rather than the default
    // better-sqlite3, which has no prebuilt binaries and would require a
    // python3/make/g++ toolchain in the Alpine image to compile from source.
    experimental: { sqliteConnector: 'native' },
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
