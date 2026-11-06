<script setup lang="ts">
import { computed, toRef, watch } from "vue";
import { holeWetter } from "../../api/client";
import { texte } from "../../config/texte";
import { useLaden } from "../../composables/useLaden";
import { formatTagMonat, ganzProzent, himmelsrichtung, zahl } from "../../lib/format";

const props = defineProps<{ tage: number }>();

// Unter dieser Zahl Fenster je Richtung sind Unterschiede noch Zufall.
const WENIG = 10;

const tage = toRef(props, "tage");
const { daten, laedt, fehler, laden } = useLaden((signal) => holeWetter(tage.value, signal));
watch(tage, () => laden());

const ost = computed(() => daten.value?.groups.find((g) => g.direction === "east"));
const west = computed(() => daten.value?.groups.find((g) => g.direction === "west"));
const mitDaten = computed(() => (ost.value?.observations ?? 0) + (west.value?.observations ?? 0) > 0);
const wenig = computed(() => (ost.value?.windows ?? 0) < WENIG || (west.value?.windows ?? 0) < WENIG);
const z = texte.statistik.wetter.zeilen;

type Gruppe = NonNullable<typeof ost.value>;
type Zeile = keyof typeof z;

function anteil(a: number | null): string {
  return a === null ? "–" : ganzProzent(a);
}

function wert(g: Gruppe | undefined, zeile: Zeile): string {
  if (!g || g.observations === 0) {
    return "–";
  }
  switch (zeile) {
    case "fenster":
      return String(g.windows);
    case "wind": {
      if (g.wind_speed_kn === null) {
        return "–";
      }
      const richtung = g.wind_direction_deg === null ? "" : himmelsrichtung(g.wind_direction_deg) + "\u00a0";
      return richtung + zahl(g.wind_speed_kn) + " kn";
    }
    case "temperatur":
      return g.temperature_c === null ? "–" : zahl(g.temperature_c) + " °C";
    case "druck":
      return g.pressure_hpa === null ? "–" : Math.round(g.pressure_hpa) + " hPa";
    case "sicht":
      return g.visibility_km === null ? "–" : zahl(g.visibility_km) + " km";
    case "niederschlag":
      return anteil(g.precipitation_share);
    case "wolken":
      return anteil(g.low_ceiling_share);
    case "gewitter":
      return anteil(g.thunderstorm_share);
  }
}

const zeilen = Object.keys(z) as Zeile[];
</script>

<template>
  <section class="hairline flex flex-col gap-3 border-x-0 border-b-0 pt-6" aria-labelledby="wetter-titel">
    <h2 id="wetter-titel" class="heading-section">{{ texte.statistik.wetter.titel }}</h2>

    <p v-if="laedt" class="text-fine" aria-live="polite">{{ texte.statistik.wetter.laedt }}</p>

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

    <p v-else-if="!daten || !mitDaten" class="text-fine">{{ texte.statistik.wetter.keine }}</p>

    <template v-else>
      <p class="text-fine">{{ texte.statistik.wetter.einleitung }}</p>
      <p v-if="wenig" class="rounded-md bg-warning p-3 text-sm text-warning-fg">{{ texte.statistik.wetter.wenige }}</p>
      <table class="w-full max-w-[40rem] text-left">
        <thead>
          <tr class="text-sm">
            <td />
            <th scope="col" class="py-1 font-medium">
              <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-east" aria-hidden="true" />{{ texte.ost }}</span>
            </th>
            <th scope="col" class="py-1 font-medium">
              <span class="inline-flex items-center gap-1.5"><span class="size-3 rounded-sm bg-west" aria-hidden="true" />{{ texte.west }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="zeile in zeilen" :key="zeile" class="border-t-[0.0625rem] border-border">
            <th scope="row" class="py-2 pr-2 text-sm font-normal text-muted-foreground">{{ z[zeile] }}</th>
            <td class="py-2 pr-2 font-medium text-foreground">{{ wert(ost, zeile) }}</td>
            <td class="py-2 font-medium text-foreground">{{ wert(west, zeile) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-if="daten.weather_since" class="text-fine">{{ texte.statistik.wetter.seit }} {{ formatTagMonat(daten.weather_since) }}</p>
      <p class="text-fine">{{ texte.statistik.wetter.erklaerung }}</p>
    </template>
  </section>
</template>
