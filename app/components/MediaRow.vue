<script setup>
defineProps({
  to: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  image: {
    type: String,
    required: true,
  },
  imageWidth: {
    type: Number,
    required: true,
  },
  imageHeight: {
    type: Number,
    required: true,
  },
  crop: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <li class="media-row">
    <div class="media-row__text">
      <h2 class="media-row__title">
        <NuxtLink :to="to">
          {{ title }}
        </NuxtLink>
      </h2>
      <p v-if="subtitle" class="media-row__subtitle">
        {{ subtitle }}
      </p>
      <div class="media-row__body">
        <slot />
      </div>
    </div>
    <!-- Decorative: the adjacent title links to the same place. -->
    <img
      :src="image"
      alt=""
      :width="imageWidth"
      :height="imageHeight"
      loading="lazy"
      class="media-row__image"
      :class="{ 'media-row__image--crop': crop }"
    >
  </li>
</template>
