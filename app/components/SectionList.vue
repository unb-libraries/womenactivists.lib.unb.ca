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
  label: {
    type: String,
    required: true,
  },
})

// `sections` is flat and in reading order (SectionPager walks it as-is); an entry may
// carry `parent` naming the section it nests under -- only the About outline does, for
// Appendices' two child pages. A section whose parent isn't in the list passed here is
// itself a root, so handing this component just the children of one section renders
// them as a plain list.
const tree = computed(() => {
  const present = new Set(props.sections.map(section => section.slug))
  return props.sections
    .filter(section => !section.parent || !present.has(section.parent))
    .map(section => ({
      ...section,
      children: props.sections.filter(child => child.parent === section.slug),
    }))
})
</script>

<template>
  <nav :aria-label="label">
    <ul>
      <li v-for="section in tree" :key="section.slug">
        <NuxtLink :to="`${basePath}/${section.slug}`">
          {{ section.label }}
        </NuxtLink>
        <ul v-if="section.children.length" class="section-list__children">
          <li v-for="child in section.children" :key="child.slug">
            <NuxtLink :to="`${basePath}/${child.slug}`">
              {{ child.label }}
            </NuxtLink>
          </li>
        </ul>
      </li>
    </ul>
  </nav>
</template>
