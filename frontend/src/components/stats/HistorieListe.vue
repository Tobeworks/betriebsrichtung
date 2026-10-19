<script setup lang="ts">
import { computed, ref } from "vue";
import { texte } from "../../config/texte";
import { formatDatum, ganzProzent, lokalesDatum } from "../../lib/format";
import { wahrheitsAnteil } from "../../lib/statistik";
import { type Eintrag, nachTagen, slotName } from "../../lib/zeitachse";

const props = defineProps<{ eintraege: Eintrag[] }>();

const SLOTS = ["morning", "afternoon", "night"] as const;
const ANZAHL = 10;

const heute = lokalesDatum(new Date());
const alle = ref(false);
// Neueste Tage zuerst, nur bis heute und nur Tage, an denen mindestens ein Fenster eine Wahrheit hat.
const tage = computed(() =>
  nachTagen(props.eintraege)
    .filter((tag) => tag.datum <= heute && SLOTS.some((s) => tag.slots[s] && wahrheitsAnteil(tag.slots[s]!) !== null))
    .reverse(),
);
const sichtbar = computed(() => (alle.value ? tage.value : tage.value.slice(0, ANZAHL)));

const farbe = "bg-[color-mix(in_oklch,var(--color-east)_var(--ost-anteil),var(--color-west))] text-foreground";
const leer = "border-[0.0625rem] border-dashed border-border text-muted-foreground";

// Anzeige je Fenster: die Richtung mit dem größeren Anteil samt Prozentwert, bei 50 zu 50 "offen".
function chip(eintrag?: Eintrag): { text: string; klasse: string; stil?: Record<string, string> } {
  const ost = eintrag ? wahrheitsAnteil(eintrag) : null;
  if (ost === null) {
    return { text: "–", klasse: leer };
  }
  const text =
    ost > 0.5 ? `${texte.ost} ${ganzProzent(ost)}` : ost < 0.5 ? `${texte.west} ${ganzProzent(1 - ost)}` : `${texte.offen} ${ganzProzent(0.5)}`;
  return { text, klasse: farbe, stil: { "--ost-anteil": `${Math.round(ost * 100)}%` } };
}
</script>

<template>
  <section class="hairline flex flex-col gap-3 border-x-0 border-b-0 pt-6" aria-labelledby="historie-titel">
    <h2 id="historie-titel" class="heading-section">{{ texte.statistik.historie }}</h2>
    <p v-if="tage.length === 0" class="text-fine">{{ texte.statistik.historieKeine }}</p>
    <template v-else>
      <p class="text-fine">{{ texte.statistik.historieHinweis }}</p>
      <table class="w-full max-w-[40rem] border-separate border-spacing-x-1.5 border-spacing-y-1.5 text-left">
        <thead>
          <tr class="text-fine">
            <td />
            <th v-for="slot in SLOTS" :key="slot" scope="col" class="font-normal">{{ slotName(slot) }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in sichtbar" :key="tag.datum">
            <th scope="row" class="whitespace-nowrap pr-1 text-sm font-normal text-foreground">{{ formatDatum(tag.datum) }}</th>
            <td v-for="slot in SLOTS" :key="slot">
              <div :class="['rounded-md px-1.5 py-1.5 text-xs font-medium leading-tight', chip(tag.slots[slot]).klasse]" :style="chip(tag.slots[slot]).stil">
                {{ chip(tag.slots[slot]).text }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <button
        v-if="tage.length > ANZAHL"
        type="button"
        class="touch-target inline-flex w-fit items-center rounded-md border-[0.0625rem] border-border px-3 text-fine"
        :aria-expanded="alle"
        @click="alle = !alle"
      >
        {{ alle ? texte.statistik.historieWeniger : `${texte.statistik.historieMehr} (${tage.length - ANZAHL})` }}
      </button>
    </template>
  </section>
</template>
