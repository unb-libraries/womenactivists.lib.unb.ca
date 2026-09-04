<script setup>
const page = await useContentPage('bibliography', () =>
  queryCollection('pages').first())

useHead({ title: page.value.title })
</script>

<template>
  <main class="bibliography-list">
    <h1>{{ page.title }}</h1>
    <ContentRenderer :value="page" />
  </main>
</template>
