<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { holeZeitachse } from "../api/client";
import HistorieListe from "../components/stats/HistorieListe.vue";
import TagesBalken from "../components/stats/TagesBalken.vue";
import { texte } from "../config/texte";
import { useLaden } from "../composables/useLaden";
import { formatDauerKurz, formatTagMonat, ganzProzent, lokalesDatum } from "../lib/format";
import { statistik } from "../lib/statistik";
import { slotName } from "../lib/zeitachse";

// Die API liefert höchstens 92 Tage je Anfrage.
const ZEITRAEUME = [30, 90] as const;
const rueckblick = ref<number>(30);

const { daten, laedt, fehler, laden } = useLaden((signal) => {
  const jetzt = Date.now();
  return holeZeitachse(lokalesDatum(new Date(jetzt - rueckblick.value * 86400000)), lokalesDatum(new Date(jetzt)), signal);
});
watch(rueckblick, () => laden());

const s = computed(() => (daten.value ? statistik(daten.value.items) : null));
const slots = ["morning", "afternoon", "night"] as const;
</script>

<template>
  <section class="flex flex-col gap-6">
    <header class="flex flex-col gap-2">
      <p class="section-eyebrow">{{ texte.statistik.untertitel }}</p>
      <h1 tabindex="-1" class="heading-page">{{ texte.navStatistik }}</h1>
      <p v-if="s && s.fenster > 0" class="text-fine">
        {{ texte.statistik.datenbasis }}: {{ formatTagMonat(s.von!) }} bis {{ formatTagMonat(s.bis!) }}, {{ s.fenster }} {{ texte.statistik.fenster }}
      </p>
    </header>

    <div
      role="group"
      :aria-label="texte.statistik.zeitraum"
      class="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:w-64"
    >
      <button
        v-for="tage in ZEITRAEUME"
        :key="tage"
        type="button"
        :aria-pressed="rueckblick === tage"
        :class="[
          'touch-target inline-flex items-center justify-center rounded-md px-3 text-sm font-medium',
          rueckblick === tage ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
        ]"
        @click="rueckblick = tage"
      >
        {{ tage === 30 ? texte.statistik.tage30 : texte.statistik.tage90 }}
      </button>
    </div>

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

    <p v-else-if="!s || s.fenster === 0" class="text-fine">{{ texte.statistik.leer }}</p>

    <template v-else>
      <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div class="flex flex-col gap-1 rounded-lg border-[0.0625rem] border-border bg-surface p-3 sm:p-4">
          <dt class="text-xs leading-tight text-muted-foreground sm:text-sm">{{ texte.statistik.ostanteil }}</dt>
          <dd class="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{{ ganzProzent(s.ostanteil ?? 0) }}</dd>
        </div>
        <div class="flex flex-col gap-1 rounded-lg border-[0.0625rem] border-border bg-surface p-3 sm:p-4">
          <dt class="text-xs leading-tight text-muted-foreground sm:text-sm">{{ texte.statistik.tageMitOst }}</dt>
          <dd class="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{{ s.tageMitOst }}&nbsp;/&nbsp;{{ s.tage.length }}</dd>
        </div>
        <div class="flex flex-col gap-1 rounded-lg border-[0.0625rem] border-border bg-surface p-3 sm:p-4">
          <dt class="text-xs leading-tight text-muted-foreground sm:text-sm">{{ texte.statistik.laengsteOstphase }}</dt>
          <dd class="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{{ formatDauerKurz(s.laengsteOstphaseStunden) }}</dd>
        </div>
        <div class="flex flex-col gap-1 rounded-lg border-[0.0625rem] border-border bg-surface p-3 sm:p-4">
          <dt class="text-xs leading-tight text-muted-foreground sm:text-sm">{{ texte.statistik.laengsteWestphase }}</dt>
          <dd class="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{{ formatDauerKurz(s.laengsteWestphaseStunden) }}</dd>
        </div>
      </dl>

      <TagesBalken :tage="s.tage" />

      <section class="hairline flex flex-col gap-3 border-x-0 border-b-0 pt-6" aria-labelledby="profil-titel">
        <h2 id="profil-titel" class="heading-section">{{ texte.statistik.profil }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="slot in slots" :key="slot" class="flex flex-col gap-1">
            <div class="flex justify-between text-foreground">
              <span>{{ slotName(slot) }}</span>
              <span v-if="s.profil[slot]" class="font-medium">{{ ganzProzent(s.profil[slot]!.ost) }} {{ texte.ost }}</span>
              <span v-else class="text-fine">{{ texte.keineDaten }}</span>
            </div>
            <div class="relative h-3 overflow-hidden rounded-full bg-west" aria-hidden="true">
              <div class="absolute inset-y-0 left-0 bg-east" :style="{ width: `${(s.profil[slot]?.ost ?? 0) * 100}%` }" />
            </div>
          </li>
        </ul>
      </section>

      <HistorieListe :eintraege="daten!.items" />

      <footer class="hairline flex flex-col gap-2 border-x-0 border-b-0 pt-6 text-fine">
        <p>{{ texte.statistik.tageMitOstErklaerung }}</p>
        <p v-if="(s.geschaetztAnteil ?? 0) > 0">{{ texte.statistik.hinweisGeschaetzt }}</p>
        <p>{{ texte.statistik.referenz }}</p>
      </footer>
    </template>
  </section>
</template>
