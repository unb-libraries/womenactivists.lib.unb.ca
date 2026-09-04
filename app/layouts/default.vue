<script setup>
const route = useRoute()
const isHome = computed(() => route.path === '/')

const nav = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/activists', label: 'Activists' },
  { to: '/commentaries', label: 'Commentaries' },
  { to: '/bibliography', label: 'Bibliography' },
]

// '/' matches only itself; every other item also claims its descendants.
function isCurrent(to) {
  return to === '/'
    ? route.path === '/'
    : route.path === to || route.path.startsWith(`${to}/`)
}

const isMenuOpen = ref(false)
watch(() => route.path, () => {
  isMenuOpen.value = false
})
</script>

<template>
  <div class="flex min-h-screen flex-col bg-page">
    <NuxtRouteAnnouncer />
    <a href="#main-content" class="skip-link">
      Skip to main content
    </a>

    <header class="site-bar bg-page">
      <div class="site-container bg-band px-4 py-6 md:flex md:flex-wrap md:items-center md:justify-between md:py-8 md:pr-4 md:pl-8">
        <div class="flex items-center justify-between gap-4">
          <component :is="isHome ? 'h1' : 'p'" class="site-title">
            <NuxtLink to="/">
              Women Social Activists of Atlantic Canada
            </NuxtLink>
          </component>

          <button
            type="button"
            class="nav-toggle md:hidden"
            :aria-expanded="isMenuOpen"
            aria-controls="main-menu"
            @click="isMenuOpen = !isMenuOpen"
          >
            <span class="sr-only">Toggle navigation</span>
            <span aria-hidden="true" class="flex flex-col gap-[4px]">
              <span
                v-for="bar in 3"
                :key="bar"
                class="h-[2px] w-[22px] rounded-[1px] bg-inverse"
              />
            </span>
          </button>
        </div>

        <nav aria-label="Main navigation" class="mt-4 md:mt-0">
          <ul
            id="main-menu"
            class="nav-list md:flex md:flex-wrap md:justify-end"
            :class="isMenuOpen ? 'block' : 'hidden md:flex'"
          >
            <li v-for="item in nav" :key="item.to" class="md:pl-4">
              <NuxtLink
                :to="item.to"
                class="nav-link"
                :aria-current="isCurrent(item.to) ? 'page' : undefined"
              >
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </nav>
      </div>
    </header>

    <!-- Not a <main>: every page renders its own. Home is ungutterred so its
         full-bleed bands sit flush. -->
    <div
      id="main-content"
      tabindex="-1"
      class="site-container bg-content"
      :class="isHome ? 'p-0' : 'p-6 md:p-8'"
    >
      <slot />
    </div>

    <footer class="site-bar mt-auto bg-page">
      <div class="site-container bg-band px-4 py-4 text-center text-inverse">
        <p class="mb-0">
          © 2026<br>
          This work is licensed under a Creative Commons
          Attribution-NonCommercial 2.5 Canada License.<br>
          Maintained by
          <a href="https://lib.unb.ca" class="footer-link">UNB Libraries</a>,
          <a href="https://unb.ca" class="footer-link">University of New Brunswick</a>.<br>
          For inquiries about licensing rights please contact us.
        </p>
      </div>
    </footer>
  </div>
</template>
