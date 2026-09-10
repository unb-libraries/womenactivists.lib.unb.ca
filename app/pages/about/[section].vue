<script setup>
import SectionList from '~/components/SectionList.vue'
import SectionPager from '~/components/SectionPager.vue'

const route = useRoute()

const page = await useContentPage(`about-${route.params.section}`, () =>
  queryCollection('aboutSections').path(route.path).first())

const { data: about } = await useAsyncData('about-index', () =>
  queryCollection('about').path('/about').first())

const outline = computed(() => about.value?.sections ?? [])

// Appendices is an outline node with no body of its own -- without its children listed
// it renders as an empty page whose only way onward is the pager.
const children = computed(() =>
  outline.value.filter(section => section.parent === route.params.section))

// One level up is the parent section for Appendices' two children, not /about -- the
// pager still walks the whole outline for prev/next, so "Up" is the only place the
// nesting shows on a child page.
const parent = computed(() => {
  const slug = outline.value.find(section => section.slug === route.params.section)?.parent
  return slug ? outline.value.find(section => section.slug === slug) : undefined
})

useHead({ title: `${page.value.title} — About the Project` })
</script>

<template>
  <main>
    <h1>{{ page.title }}</h1>
    <ContentRenderer :value="page" />
    <SectionList
      v-if="children.length"
      :sections="children"
      base-path="/about"
      :label="`${page.title} pages`"
    />
    <SectionPager
      :sections="outline"
      base-path="/about"
      :current-slug="route.params.section"
      :up-path="parent ? `/about/${parent.slug}` : '/about'"
      :up-label="parent?.label ?? 'About the Project'"
    />
  </main>
</template>
