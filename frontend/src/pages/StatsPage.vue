<script setup lang="ts">
import { computed } from "vue";
import { holeZeitachse } from "../api/client";
import TagesBalken from "../components/stats/TagesBalken.vue";
import { texte } from "../config/texte";
import { useLaden } from "../composables/useLaden";
import { formatDauer, formatTagMonat, ganzProzent, lokalesDatum } from "../lib/format";
import { statistik } from "../lib/statistik";
import { slotName } from "../lib/zeitachse";

const TAGE_RUECKBLICK = 30;

const { daten, laedt, fehler, laden } = useLaden((signal) => {
  const jetzt = Date.now();
  return holeZeitachse(lokalesDatum(new Date(jetzt - TAGE_RUECKBLICK * 86400000)), lokalesDatum(new Date(jetzt)), signal);
});

const s = computed(() => (daten.value ? statistik(daten.value.items) : null));
const slots = ["morning", "afternoon", "night"] as const;
</script>

<template>
  <section class="flex flex-col gap-6">
    <header class="flex flex-col gap-2">
      <p class="section-eyebrow">{{ texte.statistik.untertitel }}</p>
      <h1 tabindex="-1" class="heading-page">{{ texte.navStatistik }}</h1>
    </header>

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
      <dl class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="rounded-lg border-[0.0625rem] border-border bg-surface p-4">
          <dt class="text-fine">{{ texte.statistik.ostanteil }}</dt>
          <dd class="text-3xl font-semibold text-foreground">{{ ganzProzent(s.ostanteil ?? 0) }}</dd>
        </div>
        <div class="rounded-lg border-[0.0625rem] border-border bg-surface p-4">
          <dt class="text-fine">{{ texte.statistik.tageMitOst }}</dt>
          <dd class="text-3xl font-semibold text-foreground">{{ s.tageMitOst }} / {{ s.tage.length }}</dd>
        </div>
        <div class="rounded-lg border-[0.0625rem] border-border bg-surface p-4">
          <dt class="text-fine">{{ texte.statistik.laengstePhase }}</dt>
          <dd class="text-3xl font-semibold text-foreground">{{ formatDauer(s.laengstePhaseStunden) }}</dd>
        </div>
      </dl>

      <TagesBalken :tage="s.tage" />

      <section class="flex flex-col gap-3" aria-labelledby="profil-titel">
        <h2 id="profil-titel" class="heading-section">{{ texte.statistik.profil }}</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="slot in slots" :key="slot" class="flex flex-col gap-1">
            <div class="flex justify-between text-foreground">
              <span>{{ slotName(slot) }}</span>
              <span v-if="s.profil[slot]">{{ ganzProzent(s.profil[slot]!.ost) }} Ost</span>
              <span v-else class="text-fine">{{ texte.keineDaten }}</span>
            </div>
            <div class="relative h-5 overflow-hidden rounded-md bg-west" aria-hidden="true">
              <div class="absolute inset-y-0 left-0 bg-east" :style="{ width: `${(s.profil[slot]?.ost ?? 0) * 100}%` }" />
            </div>
          </li>
        </ul>
      </section>

      <footer class="flex flex-col gap-2 text-fine">
        <p>
          {{ texte.statistik.datenbasis }}: {{ s.fenster }} {{ texte.statistik.fenster }} ({{ formatTagMonat(s.von!) }} bis {{ formatTagMonat(s.bis!) }}).
          <template v-if="(s.geschaetztAnteil ?? 0) > 0">{{ texte.statistik.hinweisGeschaetzt }}</template>
        </p>
        <p>{{ texte.statistik.referenz }}</p>
      </footer>
    </template>
  </section>
</template>
