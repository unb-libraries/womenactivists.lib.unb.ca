<script setup>
const route = useRoute()

const commentary = await useContentPage(`commentary-${route.params.slug}`, () =>
  queryCollection('commentaries').path(route.path).first())

useHead({ title: commentary.value.title })
</script>

<template>
  <main>
    <h1>{{ commentary.title }}</h1>
    <p class="byline">
      {{ commentary.authorName }}
    </p>
    <img
      :src="commentary.authorPortrait"
      :alt="commentary.authorPortraitAlt"
      width="250"
      height="215"
      class="bio-portrait bio-portrait--natural"
    >
    <!-- Baked into frontmatter by scripts/migrate-content.mjs, never runtime input. -->
    <div v-html="commentary.authorBio" />
    <ContentRenderer :value="commentary" />
  </main>
</template>
