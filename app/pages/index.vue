<script setup>
import ActivistSlide from '~/components/ActivistSlide.vue'

const { data: activists } = await useAsyncData('activists-featured', () =>
  queryCollection('activists')
    .select('title', 'path', 'portrait', 'summary')
    .order('title', 'ASC')
    .all())

// Picked after hydration, so each visit differs. The trade-off: the prerendered
// HTML has an empty slideshow, so home contributes no activist links to the
// generate crawl — route discovery rests on /activists and each bio's own
// section list. Don't remove those links.
const featured = ref([])
onMounted(() => {
  featured.value = shuffle(activists.value ?? []).slice(0, 6)
})

useHead({ title: 'Home' })
</script>

<template>
  <main>
    <section aria-labelledby="profiles-of-wisdom">
      <h2 id="profiles-of-wisdom" class="view-header">
        Profiles of Wisdom
      </h2>
      <div class="view-content">
        <ActivistSlide
          v-for="activist in featured"
          :key="activist.path"
          :activist="activist"
        />
      </div>
      <p class="view-footer">
        <NuxtLink to="/activists">
          View All Activists
        </NuxtLink>
      </p>
    </section>
  </main>
</template>
