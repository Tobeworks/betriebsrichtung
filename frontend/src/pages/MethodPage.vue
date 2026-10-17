<script setup lang="ts">
import { methodik } from "../config/methodik";
import { texte } from "../config/texte";
</script>

<template>
  <article class="flex max-w-[40rem] flex-col gap-8">
    <header class="flex flex-col gap-2">
      <p class="section-eyebrow">{{ texte.navMethodik }}</p>
      <h1 tabindex="-1" class="heading-page">Wie die Prognose entsteht</h1>
    </header>

    <section v-for="abschnitt in methodik" :key="abschnitt.titel" class="flex flex-col gap-3">
      <h2 class="heading-section">{{ abschnitt.titel }}</h2>
      <p v-for="absatz in abschnitt.absaetze" :key="absatz" class="leading-[1.6]">{{ absatz }}</p>
      <ul v-if="abschnitt.liste" class="flex list-disc flex-col gap-2 pl-5 leading-[1.6]">
        <li v-for="punkt in abschnitt.liste" :key="punkt">{{ punkt }}</li>
      </ul>
    </section>

    <p class="text-fine">{{ texte.haftung }}</p>
  </article>
</template>
