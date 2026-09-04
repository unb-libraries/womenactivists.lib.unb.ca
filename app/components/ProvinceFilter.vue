<script setup>
import { provinces } from '~/utils/provinces'

const model = defineModel({ type: String, default: 'All' })
</script>

<template>
  <div class="exposed-form">
    <label class="exposed-form__label" for="province-filter">
      View all or browse by province
    </label>
    <select id="province-filter" v-model="model" class="exposed-form__select">
      <option value="All">
        - Any -
      </option>
      <option v-for="p in provinces" :key="p" :value="p">
        {{ p }}
      </option>
    </select>
  </div>
</template>
