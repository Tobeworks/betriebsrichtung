<script setup lang="ts">
import { computed } from "vue";
import { texte } from "../../config/texte";
import { formatDatum, formatTagMonat, ganzProzent } from "../../lib/format";
import type { Tagesanteil } from "../../lib/statistik";

const props = defineProps<{ tage: Tagesanteil[] }>();

const HOEHE = 40;
const breite = computed(() => 100 / props.tage.length);
// Bei vielen Tagen nur jeden n-ten beschriften, damit die Zahlen auf dem Handy nicht ineinanderlaufen.
const schritt = computed(() => Math.ceil(props.tage.length / 8));
</script>

<template>
  <figure class="hairline flex flex-col gap-3 border-x-0 border-b-0 pt-6">
    <figcaption class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span class="heading-section">{{ texte.statistik.verlauf }}</span>
      <span class="flex gap-4 text-fine">
        <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-west" aria-hidden="true" />{{ texte.west }}</span>
        <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-east" aria-hidden="true" />{{ texte.ost }}</span>
      </span>
    </figcaption>
    <svg
      :viewBox="`0 0 100 ${HOEHE}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="texte.statistik.verlauf"
      class="block h-32 w-full rounded-md bg-muted motion-safe:animate-aufbau sm:h-40"
      shape-rendering="crispEdges"
    >
      <g v-for="(tag, i) in tage" :key="tag.datum">
        <title>{{ formatDatum(tag.datum) }}: {{ ganzProzent(tag.ost) }} Ost ({{ tag.fenster }} {{ texte.statistik.fenster }})</title>
        <rect class="fill-west" :x="i * breite" y="0" :width="breite - 0.4" :height="HOEHE * (1 - tag.ost)" />
        <rect class="fill-east" :x="i * breite" :y="HOEHE * (1 - tag.ost)" :width="breite - 0.4" :height="HOEHE * tag.ost" />
      </g>
    </svg>
    <div class="relative h-5" aria-hidden="true">
      <span
        v-for="(tag, i) in tage"
        v-show="i % schritt === 0"
        :key="tag.datum"
        class="absolute -translate-x-1/2 whitespace-nowrap text-fine"
        :style="{ left: `${i * breite + breite / 2}%` }"
      >{{ formatTagMonat(tag.datum) }}</span>
    </div>
    <ul class="sr-only">
      <li v-for="tag in tage" :key="tag.datum">{{ formatDatum(tag.datum) }}: {{ ganzProzent(tag.ost) }} Ost</li>
    </ul>
  </figure>
</template>
