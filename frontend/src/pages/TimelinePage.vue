<script setup lang="ts">
import AktuelleRichtung from "../components/timeline/AktuelleRichtung.vue";
import ZeitachsenDiagramm from "../components/timeline/ZeitachsenDiagramm.vue";
import ZeitachsenListe from "../components/timeline/ZeitachsenListe.vue";
import { texte } from "../config/texte";
import { useZeitachse } from "../composables/useZeitachse";

const { daten, laedt, fehler, beispiel, laden } = useZeitachse();
</script>

<template>
  <section class="flex flex-col gap-6">
    <header class="flex flex-col gap-2">
      <p class="section-eyebrow">{{ texte.verlaufUntertitel }}</p>
      <h1 tabindex="-1" class="heading-page">{{ texte.verlaufTitel }}</h1>
    </header>

    <p v-if="beispiel" class="text-fine">{{ texte.beispielHinweis }}</p>

    <p v-if="laedt" class="text-fine" aria-live="polite">{{ texte.laedt }}</p>

    <div v-else-if="fehler" role="alert" class="flex flex-col items-start gap-3 rounded-md bg-danger p-4 text-danger-fg">
      <p>{{ fehler }}</p>
      <button
        type="button"
        class="touch-target inline-flex items-center rounded-md border-[0.125rem] border-danger-fg px-4 font-medium"
        @click="laden"
      >
        {{ texte.erneutVersuchen }}
      </button>
    </div>

    <template v-else-if="daten">
      <AktuelleRichtung :eintraege="daten.items" />
      <ZeitachsenDiagramm :eintraege="daten.items" />
      <ZeitachsenListe :eintraege="daten.items" />
    </template>
  </section>
</template>
