<script setup lang="ts">
import { PlaneTakeoff } from "@lucide/vue";
import { computed } from "vue";
import { texte } from "../../config/texte";
import { aktuelleRichtung } from "../../lib/aktuell";
import type { Eintrag } from "../../lib/zeitachse";

const props = defineProps<{ eintraege: Eintrag[] }>();

const aktuell = computed(() => aktuelleRichtung(props.eintraege, Date.now()));
const richtung = computed(() => aktuell.value.richtung);
const fuellung = computed(() =>
  richtung.value === "ost" ? "var(--color-east)" : richtung.value === "west" ? "var(--color-west)" : "var(--color-muted)",
);
const titel = computed(() => (richtung.value === "ost" ? texte.ostbetrieb : richtung.value === "west" ? texte.westbetrieb : texte.keineAktuellenDaten));
const zeilen = computed(() =>
  richtung.value === "ost"
    ? [texte.startOst, texte.landungOst]
    : richtung.value === "west"
      ? [texte.startWest, texte.landungWest]
      : [],
);
const herkunft = computed(() => {
  const h = aktuell.value.herkunft;
  return h === "geschaetzt" ? texte.herkunftGeschaetzt : h === "beobachtet" ? texte.beobachtet : h === "prognose" ? texte.prognose : "";
});
</script>

<template>
  <section
    aria-labelledby="aktuell-titel"
    class="flex items-center gap-4 rounded-lg border-[0.0625rem] border-border bg-surface p-4 motion-safe:animate-einblenden sm:gap-6 sm:p-6"
  >
    <PlaneTakeoff
      :class="['size-24 shrink-0 text-foreground sm:size-32', richtung === 'west' ? '-scale-x-100' : '']"
      :fill="fuellung"
      :stroke-width="1.25"
      aria-hidden="true"
    />
    <div class="flex min-w-0 flex-col gap-1">
      <p class="text-fine">{{ texte.aktuell }}</p>
      <h2 id="aktuell-titel" class="text-2xl font-semibold leading-tight text-foreground sm:text-3xl">{{ titel }}</h2>
      <p v-for="zeile in zeilen" :key="zeile" class="leading-snug text-foreground">{{ zeile }}</p>
      <p v-if="herkunft" class="text-fine">{{ herkunft }}</p>
    </div>
  </section>
</template>
