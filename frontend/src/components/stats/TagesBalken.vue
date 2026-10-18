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
  <figure class="flex flex-col gap-2">
    <figcaption class="heading-section">{{ texte.statistik.verlauf }}</figcaption>
    <svg
      :viewBox="`0 0 100 ${HOEHE}`"
      preserveAspectRatio="none"
      role="img"
      :aria-label="texte.statistik.verlauf"
      class="block h-40 w-full rounded-md bg-muted motion-safe:animate-aufbau"
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
