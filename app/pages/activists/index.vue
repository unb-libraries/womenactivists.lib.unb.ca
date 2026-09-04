<script setup>
import MediaRow from '~/components/MediaRow.vue'
import ProvinceFilter from '~/components/ProvinceFilter.vue'
import { provinces } from '~/utils/provinces'

const PAGE_SIZE = 10

const { data: activists } = await useAsyncData('activists-directory', () =>
  queryCollection('activists')
    .select('title', 'path', 'portrait', 'summary', 'province')
    .order('title', 'ASC')
    .all())

const route = useRoute()
const router = useRouter()

// Filter and page live in the query string, so any view is linkable and the
// back button works. Everything below derives from the route.
const queryBase = computed(() =>
  provinces.includes(route.query.province) ? { province: route.query.province } : {})

const province = computed({
  get: () => queryBase.value.province ?? 'All',
  set: value => router.replace({
    query: value === 'All' ? {} : { province: value },
  }),
})

const filtered = computed(() => {
  const all = activists.value ?? []
  return province.value === 'All' ? all : all.filter(a => a.province === province.value)
})

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))

const page = computed(() => {
  const n = Number(route.query.page)
  return Number.isInteger(n) && n >= 1 ? Math.min(n, pageCount.value) : 1
})

const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

const pageQuery = n => ({ query: { ...queryBase.value, ...(n === 1 ? {} : { page: n }) } })

useHead({ title: 'Activists' })
</script>

<template>
  <main>
    <h1>Activists</h1>
    <p>
      Introducing the experience, values, lessons, skills and advice of elder
      Atlantic Canadian women. Each one carries decades of work toward creating
      change in how society operates.
    </p>

    <ProvinceFilter v-model="province" />

    <p class="results-count" aria-live="polite">
      {{ filtered.length }} {{ filtered.length === 1 ? 'activist' : 'activists' }}
      <template v-if="province !== 'All'">
        in {{ province }}
      </template>
    </p>

    <ul v-if="paged.length" class="media-rows">
      <MediaRow
        v-for="activist in paged"
        :key="activist.path"
        crop
        :to="activist.path"
        :title="activist.title"
        :image="activist.portrait"
        :image-width="150"
        :image-height="190"
      >
        {{ activist.summary }}
      </MediaRow>
    </ul>
    <p v-else>
      No activists are listed for {{ province }}.
    </p>

    <nav v-if="pageCount > 1" aria-label="Activist list pages">
      <ul class="pagination">
        <li v-for="n in pageCount" :key="n">
          <NuxtLink
            replace
            :to="pageQuery(n)"
            class="pagination__link"
            :class="{ 'pagination__link--active': n === page }"
            :aria-current="n === page ? 'page' : undefined"
          >
            <span class="sr-only">Page </span>{{ n }}
          </NuxtLink>
        </li>
        <li v-if="page < pageCount">
          <NuxtLink replace :to="pageQuery(page + 1)" class="pagination__link">
            <span aria-hidden="true">››</span>
            <span class="sr-only">Next page</span>
          </NuxtLink>
        </li>
        <li v-if="page < pageCount">
          <NuxtLink replace :to="pageQuery(pageCount)" class="pagination__link">
            Last <span aria-hidden="true">»</span>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </main>
</template>
