<script setup lang="ts">
import { RouterLink } from "vue-router";
import { texte } from "../config/texte";
</script>

<template>
  <section class="flex flex-col gap-4">
    <h1 tabindex="-1" class="heading-page">{{ texte.nichtGefundenTitel }}</h1>
    <p class="text-fine">{{ texte.nichtGefundenText }}</p>
    <RouterLink
      to="/"
      class="touch-target inline-flex w-fit items-center rounded-md bg-west px-4 font-medium text-west-fg"
    >
      {{ texte.zurStartseite }}
    </RouterLink>
  </section>
</template>
