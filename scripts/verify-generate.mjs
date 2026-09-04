#!/usr/bin/env node
// Assert that `nuxt generate` produced every page content/ implies.
//
// Nitro finds routes by crawling links, the home page's featured activists are picked
// client-side, and nitro.prerender.failOnError is false -- so a dropped link in the
// /activists directory would ship a site missing bios with a green build. Expectations
// come from content/ rather than a page count so they stay correct as content is added.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'content')
const OUT = join(ROOT, '.output', 'public')

const SECTION_FILE = /^(\d+)\.(.+)\.md$/

function dirs(path) {
  if (!existsSync(path))
    return []
  return readdirSync(path, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name).sort()
}

function sectionSlugs(path) {
  if (!existsSync(path))
    return []
  return readdirSync(path).map(f => f.match(SECTION_FILE)).filter(Boolean).map(m => m[2]).sort()
}

// Hand-parsed rather than with a YAML dependency: this runs in the build image with
// nothing extra installed, and the frontmatter shape is fixed by the migration.
function frontmatterSections(file) {
  const body = readFileSync(file, 'utf8')
  const fm = body.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm)
    return []
  // Literal space/tab, not \s: satisfies regexp/no-super-linear-backtracking.
  return [...fm[1].matchAll(/^[ \t]+-[ \t]+slug:[ \t]*(\S[^\n]*)$/gm)]
    .map(m => m[1].trim().replace(/^["']|["']$/g, ''))
}

const expected = new Set(['/', '/activists', '/about', '/commentaries', '/bibliography'])
const contentIssues = []

for (const slug of dirs(join(CONTENT, 'activists'))) {
  const dir = join(CONTENT, 'activists', slug)
  expected.add(`/activists/${slug}`)

  const onDisk = sectionSlugs(dir)
  for (const section of onDisk)
    expected.add(`/activists/${slug}/${section}`)

  // Either direction is a content bug nothing else catches: a bio linking to a 404, or a
  // written section unreachable from its own bio.
  const declared = frontmatterSections(join(dir, 'index.md')).sort()
  for (const s of declared) {
    if (!onDisk.includes(s))
      contentIssues.push(`activists/${slug}: frontmatter lists section "${s}" with no matching NN.${s}.md`)
  }
  for (const s of onDisk) {
    if (!declared.includes(s))
      contentIssues.push(`activists/${slug}: ${s} has a file but is absent from the sections frontmatter`)
  }
}

for (const section of sectionSlugs(join(CONTENT, 'about')))
  expected.add(`/about/${section}`)

for (const slug of sectionSlugs(join(CONTENT, 'commentaries')))
  expected.add(`/commentaries/${slug}`)

// From nitro.prerender.routes; app.conf serves it via error_page.
const files = ['404.html']
for (const route of expected)
  files.push(route === '/' ? 'index.html' : route.replace(/^\//, ''))

const missing = files.filter((f) => {
  if (f.endsWith('.html'))
    return !existsSync(join(OUT, f))
  // try_files serves either shape.
  return !existsSync(join(OUT, f, 'index.html')) && !existsSync(join(OUT, `${f}.html`))
})

if (contentIssues.length) {
  console.error(`\nContent inconsistencies (${contentIssues.length}):`)
  for (const issue of contentIssues) console.error(`  - ${issue}`)
}

if (missing.length) {
  console.error(`\nnuxt generate did not produce ${missing.length} of ${files.length} expected pages:`)
  for (const f of missing) console.error(`  - /${f}`)
  console.error('\nThe prerender crawl missed these. Check that every route is reachable by a')
  console.error('server-rendered link (the home page\'s featured activists are client-side only),')
  console.error('or add the routes to nitro.prerender.routes in nuxt.config.ts.\n')
  process.exit(1)
}

if (contentIssues.length)
  process.exit(1)

console.log(`verify-generate: ${files.length} expected pages present in .output/public`)
