<script setup>
import SectionPager from '~/components/SectionPager.vue'

const route = useRoute()

const page = await useContentPage(`about-${route.params.section}`, () =>
  queryCollection('aboutSections').path(route.path).first())

const { data: about } = await useAsyncData('about-index', () =>
  queryCollection('about').path('/about').first())

useHead({ title: `${page.value.title} — About the Project` })
</script>

<template>
  <main>
    <h1>{{ page.title }}</h1>
    <ContentRenderer :value="page" />
    <SectionPager
      :sections="about?.sections ?? []"
      base-path="/about"
      :current-slug="route.params.section"
      up-path="/about"
      up-label="About the Project"
    />
  </main>
</template>
