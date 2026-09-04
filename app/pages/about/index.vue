<script setup>
import SectionList from '~/components/SectionList.vue'

const page = await useContentPage('about-index', () =>
  queryCollection('about').path('/about').first())

useHead({ title: page.value.title })
</script>

<template>
  <main>
    <h1>{{ page.title }}</h1>
    <ContentRenderer :value="page" />
    <SectionList
      :sections="page.sections"
      base-path="/about"
      label="About the Project sections"
    />
  </main>
</template>
