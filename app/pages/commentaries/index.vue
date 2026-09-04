<script setup>
import MediaRow from '~/components/MediaRow.vue'

const { data: commentaries } = await useAsyncData('commentaries-all', () =>
  queryCollection('commentaries').all())

useHead({ title: 'Commentaries' })
</script>

<template>
  <main>
    <h1>Commentaries</h1>
    <p>
      These Commentaries add three interpretations of the profiles and prompt you into
      further reflections and some relevant literature.
    </p>
    <p>
      Having seen an early version of the website, three distinguished younger colleagues
      in the academic field of Adult Education in Canada kindly agreed to contribute to
      the project. They, with Liz, discussed how each Commentary might be structured. The
      final decision was to use three guiding questions:
    </p>
    <ul>
      <li>What did I get out of the profiles?</li>
      <li>Where does the practical knowledge of the elders link to some relevant academic knowledge?</li>
      <li>How might the website be expanded internationally and inter-generationally?</li>
    </ul>
    <ul class="media-rows">
      <MediaRow
        v-for="commentary in commentaries"
        :key="commentary.path"
        :to="commentary.path"
        :title="commentary.title"
        :subtitle="commentary.authorName"
        :image="commentary.authorPortrait"
        :image-width="250"
        :image-height="215"
      >
        <!-- Build-time frontmatter, never runtime input. -->
        <div v-html="commentary.authorBio" />
      </MediaRow>
    </ul>
  </main>
</template>
