<script setup lang="ts">
import { PlaneTakeoff } from "@lucide/vue";
import { computed, ref } from "vue";
import { saeulen, tagesraster } from "../../lib/diagramm";
import { formatDatum, formatUhrzeit, formatWochentag, lokalesDatum } from "../../lib/format";
import { beschreibeEintrag, type Eintrag, slotName } from "../../lib/zeitachse";
import { texte } from "../../config/texte";

const props = defineProps<{ eintraege: Eintrag[] }>();

const TAGE = 7;
const HOEHE = 40;

const jetzt = Date.now();
// Betriebstag wie die Fenster: 6 bis 6 Uhr, vor 6 Uhr gilt noch der Vortag.
const raster = tagesraster(lokalesDatum(new Date(jetzt - 6 * 3600000)), TAGE);
const von = raster[0].von;
const spanne = raster[TAGE - 1].bis - von;

const spalten = computed(() => saeulen(props.eintraege, raster[0].datum, raster[TAGE - 1].datum));

function prozent(zeit: number): number {
  return ((zeit - von) / spanne) * 100;
}

const jetztProzent = prozent(jetzt);

const rahmen = ref<HTMLElement | null>(null);
const zeiger = ref<number | null>(null);

function bewegen(ereignis: PointerEvent): void {
  const box = rahmen.value?.getBoundingClientRect();
  if (box && box.width > 0) {
    zeiger.value = von + Math.min(1, Math.max(0, (ereignis.clientX - box.left) / box.width)) * spanne;
  }
}

const hinweis = computed(() => {
  const zeit = zeiger.value;
  if (zeit === null) {
    return null;
  }
  const saeule = spalten.value.find((s) => s.von <= zeit && zeit < s.bis);
  const nahAmJetzt = Math.abs(zeit - jetzt) < spanne * 0.01;
  const gemeint = nahAmJetzt ? jetzt : zeit;
  const uhr = formatUhrzeit(new Date(gemeint).toISOString());
  return {
    links: Math.min(88, Math.max(12, prozent(zeit))),
    kopf: nahAmJetzt
      ? `${texte.jetzt}, ${uhr} Uhr`
      : `${formatDatum(lokalesDatum(new Date(zeit)))}, ${uhr} Uhr`,
    zeile: saeule
      ? `${slotName(saeule.eintrag.slot)}: ${beschreibeEintrag(saeule.eintrag).text}`
      : texte.keineDaten,
  };
});
</script>

<template>
  <figure v-if="spalten.length > 0" class="flex flex-col gap-2">
    <figcaption class="flex flex-wrap items-center gap-x-5 gap-y-1 text-fine">
      <span class="inline-flex items-center gap-1.5">
        <PlaneTakeoff class="size-5 -scale-x-100" aria-hidden="true" />
        <span class="size-3 rounded-sm bg-west" aria-hidden="true" />
        {{ texte.westbetrieb }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <PlaneTakeoff class="size-5" aria-hidden="true" />
        <span class="size-3 rounded-sm bg-east" aria-hidden="true" />
        {{ texte.ostbetrieb }}
      </span>
    </figcaption>
    <p class="text-fine">{{ texte.diagrammHinweis }}</p>
    <div class="flex flex-col gap-1">
      <div
        ref="rahmen"
        class="relative h-40 touch-pan-y"
        @pointermove="bewegen"
        @pointerdown="bewegen"
        @pointerleave="zeiger = null"
      >
        <svg
          :viewBox="`0 0 100 ${HOEHE}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="texte.diagrammBeschreibung"
          class="block size-full rounded-md bg-muted motion-safe:animate-aufbau"
          shape-rendering="crispEdges"
        >
          <g v-for="s in spalten" :key="s.von">
            <rect :class="['fill-west', s.eintrag.status === 'forecast' ? 'opacity-60' : '']" :x="prozent(s.von)" y="0" :width="prozent(s.bis) - prozent(s.von)" :height="HOEHE * (1 - s.ost)" />
            <rect
              :class="['fill-east', s.eintrag.status === 'forecast' ? 'opacity-60' : '']"
              :x="prozent(s.von)"
              :y="HOEHE * (1 - s.ost)"
              :width="prozent(s.bis) - prozent(s.von)"
              :height="HOEHE * s.ost"
            />
          </g>
        </svg>
        <div
          v-for="t in raster.slice(1)"
          :key="t.datum"
          class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-background"
          :style="{ left: `${prozent(t.von)}%` }"
          aria-hidden="true"
        />
        <div
          v-if="jetztProzent >= 0 && jetztProzent <= 100"
          class="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-foreground"
          :style="{ left: `${jetztProzent}%` }"
          aria-hidden="true"
        >
          <span v-if="!hinweis" class="absolute left-1.5 top-1.5 rounded-sm bg-foreground px-1.5 text-xs font-medium text-background">{{ texte.jetzt }}</span>
        </div>
        <template v-if="hinweis && zeiger !== null">
          <div
            class="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-foreground/50"
            :style="{ left: `${prozent(zeiger)}%` }"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute top-1.5 z-10 w-max max-w-[80%] -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs text-background shadow"
            :style="{ left: `${hinweis.links}%` }"
            aria-hidden="true"
          >
            <p class="font-medium">{{ hinweis.kopf }}</p>
            <p>{{ hinweis.zeile }}</p>
          </div>
        </template>
      </div>
      <div class="relative h-5" aria-hidden="true">
        <span
          v-for="(t, i) in raster"
          :key="t.datum"
          :class="['absolute -translate-x-1/2 whitespace-nowrap text-fine', i === 0 ? 'font-semibold text-foreground' : '']"
          :style="{ left: `${prozent(t.mitte)}%` }"
        >{{ formatWochentag(t.datum) }}</span>
      </div>
    </div>
  </figure>
</template>
