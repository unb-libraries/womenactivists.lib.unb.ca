// One-off migration script: pulls content from the live Drupal site
// womenactivists.lib.unb.ca into content/*.md + public/images/*, run once
// to seed this repo. Kept afterward as provenance documentation of where
// the migrated content came from. Not part of the runtime build.
//
// Usage: pnpm migrate

import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as cheerio from 'cheerio'
import TurndownService from 'turndown'

const SITE = 'https://womenactivists.lib.unb.ca'
const USER_AGENT = 'UNB-Libraries-Nuxt-Migration/1.0 (contact: cvillami@unb.ca)'
const CONCURRENCY = 2
const REQUEST_SPACING_MS = 300

const ROOT = new URL('..', import.meta.url).pathname
const CONTENT_DIR = path.join(ROOT, 'content')
const IMAGES_DIR = path.join(ROOT, 'public/images')

// NOTE: activist sections are NOT a fixed sequence across all 27 profiles —
// Drupal's Book-module outline for each activist has its own slugs, labels,
// and count (e.g. ann-brennan has 4 sections incl. "practising-her-activism"
// [British spelling] and a combined "creating-change-lessons-skills-and-advice",
// while ann-bell has 5 with "practicing" [American] and separate "key-achievements"
// / "lessons-learned"). Each activist's section list is discovered from their
// own bio page's outline nav rather than assumed.

const ABOUT_SECTIONS = [
  { slug: 'project-origins', oldPath: '/about/project-origins' },
  { slug: 'beginning-planning', oldPath: '/node/145' },
  { slug: 'interviewing', oldPath: '/about/interviewing' },
  { slug: 'writing-profiles', oldPath: '/about/writing-profiles' },
  { slug: 'acknowledgements', oldPath: '/about/acknowledgements' },
  { slug: 'personal-reflection', oldPath: '/about/personal-reflection' },
  { slug: 'using-website', oldPath: '/about/using-website' },
  { slug: 'appendices', oldPath: '/about/appendices' },
  // Appendices is itself a parent with two children in Drupal's Book outline
  // (the only about-section with a nested nav) — flattened in here rather
  // than modeling another level of nesting for two small pages.
  { slug: 'interview-guide', oldPath: '/about/interview-guide' },
  { slug: 'change-agent-strategies', oldPath: '/about/change-agent-strategies' },
]

const COMMENTARY_SLUGS = [
  'phenomenal-women-atlantic-canada',
  'stories-passion-persistence-public-service',
  'women-active-citizens',
]

// Derived from fetching /activists?tid=1..4 (Drupal's province taxonomy filter) —
// province isn't present on the bio page itself, so it's recorded here once.
const PROVINCE_BY_SLUG = {
  'ann-brennan': 'New Brunswick',
  'carolyn-mcnulty': 'New Brunswick',
  'elizabeth-betty-lacey': 'New Brunswick',
  'madeleine-gaudet': 'New Brunswick',
  'marian-perkins': 'New Brunswick',
  'mary-lou-stirling': 'New Brunswick',
  'mary-majka': 'New Brunswick',
  'sister-angelina-martz-scic': 'New Brunswick',
  'sue-rickards': 'New Brunswick',
  'ann-bell': 'Newfoundland and Labrador',
  'kathy-sheldon': 'Newfoundland and Labrador',
  'nancy-riche': 'Newfoundland and Labrador',
  'phyllis-artiss': 'Newfoundland and Labrador',
  'shannie-duff': 'Newfoundland and Labrador',
  'sister-kathrine-bellamy-rsm': 'Newfoundland and Labrador',
  'betty-peterson': 'Nova Scotia',
  'joan-hicks': 'Nova Scotia',
  'may-bouchard': 'Nova Scotia',
  'shirley-chernin': 'Nova Scotia',
  'sister-dorothy-moore-csm': 'Nova Scotia',
  'sister-joan-okeefe-sc': 'Nova Scotia',
  'stella-lord': 'Nova Scotia',
  'viola-robinson': 'Nova Scotia',
  'yvonne-atwell': 'Nova Scotia',
  'edith-perry': 'Prince Edward Island',
  'maria-bernard': 'Prince Edward Island',
  'olive-bryanton': 'Prince Edward Island',
}

const ACTIVIST_SLUGS = Object.keys(PROVINCE_BY_SLUG).sort()

let DIRECTORY_EXCERPTS = new Map()

const turndown = new TurndownService({ headingStyle: 'atx' })

function pLimit(concurrency) {
  let active = 0
  const queue = []
  const next = () => {
    if (active >= concurrency || queue.length === 0)
      return
    active++
    const { fn, resolve, reject } = queue.shift()
    fn().then(resolve, reject).finally(() => {
      active--
      next()
    })
  }
  return fn => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject })
    next()
  })
}

const limit = pLimit(CONCURRENCY)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithRetry(url, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (res.status !== 429)
      return res
    const retryAfter = Number(res.headers.get('retry-after'))
    const delayMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000
    console.warn(`429 from ${url} — waiting ${delayMs}ms (attempt ${attempt}/${maxAttempts})`)
    await sleep(delayMs)
  }
  throw new Error(`GET ${url} -> still 429 after ${maxAttempts} attempts`)
}

async function fetchHtml(urlPath) {
  await sleep(REQUEST_SPACING_MS)
  const res = await fetchWithRetry(new URL(urlPath, SITE))
  if (!res.ok)
    throw new Error(`GET ${urlPath} -> ${res.status}`)
  return cheerio.load(await res.text())
}

async function downloadImage(srcPath, destFile) {
  const res = await fetchWithRetry(new URL(srcPath, SITE))
  if (!res.ok)
    throw new Error(`GET ${srcPath} -> ${res.status}`)
  await mkdir(path.dirname(destFile), { recursive: true })
  await writeFile(destFile, Buffer.from(await res.arrayBuffer()))
}

// Drupal image styles are served from /styles/<style>/public/<original> with
// a signed ?itok= query — strip both to resolve the original full-res file.
function originalImagePath(styledSrc) {
  return styledSrc.replace(/\/styles\/[^/]+\/public\//, '/').split('?')[0]
}

function extOf(srcPath) {
  return path.extname(srcPath.split('?')[0]) || '.jpg'
}

function rewriteLinks(html) {
  return html
    .replace(/href="\/content\/([a-z0-9-]+)"/g, 'href="/activists/$1"')
    .replace(/href="([a-z0-9-]+)"/g, (match, slug) =>
      ACTIVIST_SLUGS.includes(slug) ? `href="/activists/${slug}"` : match)
}

function toMarkdown(html) {
  return turndown.turndown(rewriteLinks(html))
}

function yamlString(value) {
  return JSON.stringify(value ?? '')
}

function frontmatter(fields) {
  const lines = ['---']
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`)
        continue
      }
      lines.push(`${key}:`)
      for (const item of value) {
        const [firstKey, ...restKeys] = Object.keys(item)
        lines.push(`  - ${firstKey}: ${yamlString(item[firstKey])}`)
        for (const k of restKeys)
          lines.push(`    ${k}: ${yamlString(item[k])}`)
      }
    }
    else {
      lines.push(`${key}: ${yamlString(value)}`)
    }
  }
  lines.push('---', '')
  return lines.join('\n')
}

async function writeContentFile(relPath, fields, body) {
  const file = path.join(CONTENT_DIR, relPath)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, `${frontmatter(fields)}${body}\n`)
  console.log(`wrote ${path.relative(ROOT, file)}`)
}

async function migrateActivist(slug) {
  const indexFile = path.join(CONTENT_DIR, `activists/${slug}/index.md`)
  if (existsSync(indexFile)) {
    console.log(`skip ${slug} (already migrated)`)
    return
  }

  const $ = await fetchHtml(`/content/${slug}`)
  const article = $('article').first()

  const title = article.find('.field--name-title').first().text().trim()
    || $('h1').first().text().trim()

  const portraitImg = article.find('.field--name-field-portrait img').first()
  const portraitSrc = originalImagePath(portraitImg.attr('src'))
  const portraitExt = extOf(portraitSrc)
  await limit(() => downloadImage(portraitSrc, path.join(IMAGES_DIR, 'activists', slug, `portrait${portraitExt}`)))

  const quote = article.find('.field--name-field-quot .field__item').first().text().trim()
  const bioHtml = article.find('.field--name-field-bio .field__item').first().html() ?? ''

  // The outline's own href is authoritative for fetching — its first path
  // segment doesn't always match the /content/<slug> slug (e.g. Betty
  // Peterson's bio is at /content/betty-peterson but her sections live under
  // /betty-peterson-aka-kukuminash/...). Only the last segment (used for the
  // new site's normalized /activists/<slug>/<section> routes) is stored.
  const sections = article.find('nav[role="navigation"] > ul > li > a').toArray().map((el) => {
    const href = $(el).attr('href') ?? ''
    return {
      slug: href.split('/').filter(Boolean).pop(),
      label: $(el).text().trim(),
      href,
    }
  })

  // "Links of Interest" — the one field on the bio page whose label is visible
  // rather than visually-hidden. External URLs, so not run through rewriteLinks.
  const links = article.find('.field--name-field-links .field__item a').toArray().map((el) => {
    const $a = $(el)
    return { url: $a.attr('href') ?? '', title: $a.text().trim() }
  }).filter(link => link.url)

  const pictures = []
  const pictureEls = article.find('.field--name-field-pics .paragraph--type--captioned-picture').toArray()
  for (let i = 0; i < pictureEls.length; i++) {
    const el = $(pictureEls[i])
    const img = el.find('.field--name-field-picture img').first()
    const src = img.attr('src')
    if (!src)
      continue
    const ext = extOf(src)
    const destRel = `activists/${slug}/picture-${i + 1}${ext}`
    await limit(() => downloadImage(src, path.join(IMAGES_DIR, destRel)))
    const caption = el.find('.field--name-field-caption .field__item').first().text().trim()
    pictures.push({ image: `/images/${destRel}`, caption })
  }

  // Excerpt comes from the directory listing text, not the bio page — it's
  // the canonical short teaser already written for that exact purpose.
  const excerpt = DIRECTORY_EXCERPTS.get(slug) ?? ''

  // index.md is written LAST, only once every section below has succeeded —
  // its existence is used as the "fully migrated" marker for --resume.
  for (let i = 0; i < sections.length; i++)
    await migrateActivistSection(slug, sections[i], i + 1)

  await writeContentFile(`activists/${slug}/index.md`, {
    title,
    portrait: `/images/activists/${slug}/portrait${portraitExt}`,
    portraitAlt: portraitImg.attr('alt') ?? title,
    quote,
    province: PROVINCE_BY_SLUG[slug],
    // Keyed `summary`: `excerpt` is reserved by @nuxt/content.
    summary: excerpt,
    sections: sections.map(({ slug: sectionSlug, label }) => ({ slug: sectionSlug, label })),
    pictures,
    links,
    oldPath: `/content/${slug}`,
  }, toMarkdown(bioHtml))
}

async function migrateActivistSection(slug, section, index) {
  const $ = await fetchHtml(section.href)
  const article = $('article').first()
  const title = article.find('.field--name-title').first().text().trim()
    || $('h1').first().text().trim()
    || section.label
  const bodyHtml = article.find('.field--name-body .field__item').first().html() ?? ''

  await writeContentFile(
    `activists/${slug}/${String(index).padStart(2, '0')}.${section.slug}.md`,
    { title, oldPath: section.href },
    toMarkdown(bodyHtml),
  )
}

async function migrateCommentary(slug) {
  const index = COMMENTARY_SLUGS.indexOf(slug) + 1
  const file = path.join(CONTENT_DIR, `commentaries/${String(index).padStart(2, '0')}.${slug}.md`)
  if (existsSync(file)) {
    console.log(`skip commentary ${slug} (already migrated)`)
    return
  }

  const $ = await fetchHtml(`/${slug}`)
  const article = $('article').first()
  const title = article.find('.field--name-title').first().text().trim()
    || $('h1').first().text().trim()

  const portraitImg = article.find('.field--name-field-portrait img').first()
  const portraitSrc = portraitImg.attr('src')
  const ext = extOf(portraitSrc)
  await limit(() => downloadImage(portraitSrc, path.join(IMAGES_DIR, 'commentaries', `${slug}${ext}`)))

  const authorBioHtml = article.find('.field--name-field-about .field__item').first().html() ?? ''
  const authorName = article.find('.field--name-field-about a').first().text().trim()
  const commentHtml = article.find('.field--name-field-comment .field__item').first().html() ?? ''

  await writeContentFile(
    `commentaries/${String(index).padStart(2, '0')}.${slug}.md`,
    {
      title,
      authorName,
      authorPortrait: `/images/commentaries/${slug}${ext}`,
      authorPortraitAlt: portraitImg.attr('alt') ?? authorName,
      authorBio: rewriteLinks(authorBioHtml),
      oldPath: `/${slug}`,
    },
    toMarkdown(commentHtml),
  )
}

async function migrateAbout() {
  const indexFile = path.join(CONTENT_DIR, 'about/index.md')
  if (!existsSync(indexFile)) {
    const $ = await fetchHtml('/about')
    const article = $('article').first()
    const title = article.find('.field--name-title').first().text().trim()
      || $('h1').first().text().trim()
    const bodyHtml = article.find('.field--name-body .field__item').first().html() ?? ''

    await writeContentFile('about/index.md', {
      title,
      oldPath: '/about',
    }, toMarkdown(bodyHtml))
  }
  else {
    console.log('skip about/index (already migrated)')
  }

  for (const section of ABOUT_SECTIONS)
    await migrateAboutSection(section)
}

async function migrateAboutSection(section) {
  const index = ABOUT_SECTIONS.findIndex(s => s.slug === section.slug) + 1
  const file = path.join(CONTENT_DIR, `about/${String(index).padStart(2, '0')}.${section.slug}.md`)
  if (existsSync(file)) {
    console.log(`skip about/${section.slug} (already migrated)`)
    return
  }

  const $ = await fetchHtml(section.oldPath)
  const article = $('article').first()
  const title = article.find('.field--name-title').first().text().trim()
    || $('h1').first().text().trim()
  const bodyHtml = article.find('.field--name-body .field__item').first().html() ?? ''

  await writeContentFile(
    `about/${String(index).padStart(2, '0')}.${section.slug}.md`,
    { title, oldPath: section.oldPath },
    toMarkdown(bodyHtml),
  )
}

async function migrateBibliography() {
  const file = path.join(CONTENT_DIR, 'pages/bibliography.md')
  if (existsSync(file)) {
    console.log('skip bibliography (already migrated)')
    return
  }

  const $ = await fetchHtml('/bibliography')
  const article = $('article').first()
  const title = article.find('.field--name-title').first().text().trim()
    || $('h1').first().text().trim()
  const bodyHtml = article.find('.field--name-body .field__item').first().html() ?? ''

  await writeContentFile('pages/bibliography.md', {
    title,
    oldPath: '/bibliography',
  }, toMarkdown(bodyHtml))
}

async function loadDirectoryExcerpts() {
  const excerpts = new Map()
  for (let page = 0; page < 3; page++) {
    const $ = await fetchHtml(page === 0 ? '/activists' : `/activists?page=${page}`)
    $('#activist-res-txt').each((_, el) => {
      const $el = $(el).clone()
      const link = $el.find('a').first()
      const href = link.attr('href') ?? ''
      const slug = href.replace('/content/', '')
      link.remove()
      const excerpt = $el.text().trim()
      if (slug)
        excerpts.set(slug, excerpt)
    })
  }
  return excerpts
}

async function main() {
  console.log(`Migrating content from ${SITE} ...`)

  DIRECTORY_EXCERPTS = await loadDirectoryExcerpts()
  console.log(`Loaded ${DIRECTORY_EXCERPTS.size} directory excerpts`)

  for (const slug of ACTIVIST_SLUGS)
    await migrateActivist(slug)

  for (const slug of COMMENTARY_SLUGS)
    await migrateCommentary(slug)

  await migrateAbout()
  await migrateBibliography()

  console.log('Migration complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
