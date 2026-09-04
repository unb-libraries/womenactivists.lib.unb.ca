<script setup>
const props = defineProps({
  sections: {
    type: Array,
    required: true,
  },
  basePath: {
    type: String,
    required: true,
  },
  currentSlug: {
    type: String,
    required: true,
  },
  upPath: {
    type: String,
    required: true,
  },
  upLabel: {
    type: String,
    default: 'Up',
  },
})

const currentIndex = computed(() => props.sections.findIndex(section => section.slug === props.currentSlug))
const previous = computed(() => currentIndex.value > 0 ? props.sections[currentIndex.value - 1] : null)
const next = computed(() => currentIndex.value < props.sections.length - 1 ? props.sections[currentIndex.value + 1] : null)
</script>

<template>
  <nav class="section-pager" aria-label="Section navigation">
    <ul class="section-pager__list">
      <li v-if="previous" class="section-pager__item--previous">
        <NuxtLink :to="`${basePath}/${previous.slug}`">
          <span aria-hidden="true">‹ </span>{{ previous.label }}
        </NuxtLink>
      </li>
      <li class="section-pager__item--center">
        <NuxtLink :to="upPath">
          {{ upLabel }}
        </NuxtLink>
      </li>
      <li v-if="next" class="section-pager__item--next">
        <NuxtLink :to="`${basePath}/${next.slug}`">
          {{ next.label }}<span aria-hidden="true"> ›</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
