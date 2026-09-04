<script setup>
import SectionPager from '~/components/SectionPager.vue'

const route = useRoute()

const page = await useContentPage(`activist-section-${route.params.slug}-${route.params.section}`, () =>
  queryCollection('activistSections').path(route.path).first())

const { data: activist } = await useAsyncData(`activist-${route.params.slug}`, () =>
  queryCollection('activists').path(`/activists/${route.params.slug}`).first())

// The heading is the section name alone, so the activist goes in the title to
// give tabs, history and bookmarks their context.
useHead({ title: () => [page.value?.title, activist.value?.title].filter(Boolean).join(' — ') })
</script>

<template>
  <main>
    <h1>{{ page.title }}</h1>
    <ContentRenderer :value="page" />
    <SectionPager
      :sections="activist?.sections ?? []"
      :base-path="`/activists/${route.params.slug}`"
      :current-slug="route.params.section"
      :up-path="`/activists/${route.params.slug}`"
      :up-label="activist?.title ?? 'Up'"
    />
  </main>
</template>
