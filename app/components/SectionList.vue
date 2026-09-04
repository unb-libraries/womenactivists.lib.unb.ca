<script setup>
defineProps({
  sections: {
    type: Array,
    required: true,
  },
  basePath: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <nav :aria-label="label">
    <ul>
      <li v-for="section in sections" :key="section.slug">
        <NuxtLink :to="`${basePath}/${section.slug}`">
          {{ section.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
