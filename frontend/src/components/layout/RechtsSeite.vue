<script setup lang="ts">
import type { Abschnitt } from "../../config/methodik";

defineProps<{ titel: string; abschnitte: Abschnitt[] }>();
</script>

<template>
  <article class="flex max-w-[40rem] flex-col gap-8">
    <header class="flex flex-col gap-2">
      <h1 tabindex="-1" class="heading-page">{{ titel }}</h1>
    </header>
    <section v-for="abschnitt in abschnitte" :key="abschnitt.titel" class="flex flex-col gap-3">
      <h2 class="heading-section">{{ abschnitt.titel }}</h2>
      <p v-for="absatz in abschnitt.absaetze" :key="absatz" class="leading-[1.6]">{{ absatz }}</p>
      <p v-for="link in abschnitt.links ?? []" :key="link.url">
        <a :href="link.url" class="underline underline-offset-4">{{ link.text }}</a>
      </p>
    </section>
  </article>
</template>
