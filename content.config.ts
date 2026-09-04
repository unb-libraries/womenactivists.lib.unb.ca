import { defineCollection, defineContentConfig, z } from '@nuxt/content'
import { provinces } from './app/utils/provinces'

const province = z.enum(provinces)

const sections = z.array(z.object({
  slug: z.string(),
  label: z.string(),
})).default([])

const pageSchema = z.object({
  title: z.string(),
  oldPath: z.string(),
})

export default defineContentConfig({
  collections: {
    activists: defineCollection({
      type: 'page',
      source: 'activists/*/index.md',
      schema: pageSchema.extend({
        portrait: z.string(),
        portraitAlt: z.string(),
        quote: z.string(),
        province,
        // Not `excerpt`: reserved by @nuxt/content, always resolves to null.
        summary: z.string(),
        sections,
        pictures: z.array(z.object({
          image: z.string(),
          caption: z.string(),
        })).default([]),
        // "Links of Interest". 17 of 27 activists have some.
        links: z.array(z.object({
          url: z.string(),
          title: z.string(),
        })).default([]),
      }),
    }),
    activistSections: defineCollection({
      type: 'page',
      source: {
        include: 'activists/*/*.md',
        exclude: ['activists/*/index.md'],
      },
      schema: pageSchema,
    }),
    commentaries: defineCollection({
      type: 'page',
      source: 'commentaries/*.md',
      schema: pageSchema.extend({
        authorName: z.string(),
        authorPortrait: z.string(),
        authorPortraitAlt: z.string(),
        authorBio: z.string(),
      }),
    }),
    about: defineCollection({
      type: 'page',
      source: 'about/index.md',
      schema: pageSchema.extend({ sections }),
    }),
    aboutSections: defineCollection({
      type: 'page',
      source: {
        include: 'about/*.md',
        exclude: ['about/index.md'],
      },
      schema: pageSchema,
    }),
    pages: defineCollection({
      type: 'page',
      source: 'pages/*.md',
      schema: pageSchema,
    }),
  },
})
