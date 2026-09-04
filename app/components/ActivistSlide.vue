<script setup>
defineProps({
  activist: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="slide">
    <div class="slide__text">
      <h3 class="slide__name">
        <NuxtLink :to="activist.path">
          {{ activist.title }}
        </NuxtLink>
      </h3>
      <p class="slide__bio">
        {{ activist.summary }}
      </p>
      <p class="slide__more">
        <NuxtLink :to="activist.path">
          Read more<span class="sr-only"> about {{ activist.title }}</span>
        </NuxtLink>
      </p>
    </div>
    <img
      :src="activist.portrait"
      alt=""
      width="300"
      height="380"
      loading="lazy"
      class="slide__portrait"
    >
  </article>
</template>
