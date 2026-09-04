<script setup>
import SectionList from '~/components/SectionList.vue'

const route = useRoute()

const activist = await useContentPage(`activist-${route.params.slug}`, () =>
  queryCollection('activists').path(route.path).first())

useHead({ title: activist.value.title })
</script>

<template>
  <main>
    <h1>{{ activist.title }}</h1>
    <img
      :src="activist.portrait"
      :alt="activist.portraitAlt"
      width="300"
      height="380"
      class="bio-portrait"
    >
    <blockquote>{{ activist.quote }}</blockquote>
    <ContentRenderer :value="activist" />
    <!-- alt="" — the figcaption already describes the image. -->
    <figure v-for="picture in activist.pictures" :key="picture.image" class="content-figure">
      <img :src="picture.image" alt="" loading="lazy">
      <figcaption>{{ picture.caption }}</figcaption>
    </figure>
    <section v-if="activist.links?.length" class="links-of-interest">
      <h2 class="links-of-interest__label">
        Links of Interest
      </h2>
      <ul>
        <li v-for="link in activist.links" :key="link.url">
          <a :href="link.url">{{ link.title }}</a>
        </li>
      </ul>
    </section>
    <SectionList
      :sections="activist.sections"
      :base-path="activist.path"
      :label="`Sections of ${activist.title}'s profile`"
    />
  </main>
</template>
