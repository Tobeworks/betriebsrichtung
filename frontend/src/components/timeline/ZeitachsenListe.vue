<script setup lang="ts">
import { computed } from "vue";
import { type Beschreibung, beschreibeEintrag, type Eintrag, nachTagen, slotName, type Zustand } from "../../lib/zeitachse";
import { formatDatum, lokalesDatum } from "../../lib/format";
import { texte } from "../../config/texte";

const props = defineProps<{ eintraege: Eintrag[] }>();

const heute = lokalesDatum(new Date());
const tage = computed(() => nachTagen(props.eintraege));
const SLOTS = ["morning", "afternoon", "night"] as const;

const flaeche: Record<Zustand, string> = {
  west: "bg-west text-west-fg",
  ost: "bg-east text-east-fg",
  offen: "bg-muted text-foreground",
  luecke: "bg-background text-muted-foreground border-[0.0625rem] border-dashed border-border",
};

// Prognose: Farbe mischt West und Ost im Verhältnis der Ostwahrscheinlichkeit, bei 50 % bleibt die Unsicherheit sichtbar.
const verlauf = "bg-[color-mix(in_oklch,var(--color-east)_var(--ost-anteil),var(--color-west))] text-foreground";

function feld(eintrag?: Eintrag): { haupt: string; neben: string; ost: boolean; klasse: string; stil?: Record<string, string> } {
  const beschreibung: Beschreibung = eintrag
    ? beschreibeEintrag(eintrag)
    : { zustand: "luecke", text: texte.keineDaten, haupt: "–", neben: texte.keineDaten };
  const anteil = beschreibung.ostAnteil;
  return {
    haupt: beschreibung.haupt,
    neben: beschreibung.neben,
    ost: anteil !== undefined,
    klasse: anteil === undefined ? flaeche[beschreibung.zustand] : verlauf,
    stil: anteil === undefined ? undefined : { "--ost-anteil": `${Math.round(anteil * 100)}%` },
  };
}
</script>

<template>
  <div v-if="eintraege.length === 0" class="text-fine">{{ texte.leer }}</div>
  <ul v-else class="flex flex-col gap-4" aria-label="Zeitachse">
    <li
      v-for="tag in tage"
      :key="tag.datum"
      :aria-current="tag.datum === heute ? 'date' : undefined"
      :class="[
        'flex flex-col gap-3 rounded-lg p-3',
        tag.datum === heute ? 'border-[0.1875rem] border-foreground' : 'border-[0.0625rem] border-border',
      ]"
    >
      <h2 class="flex items-center gap-2 font-medium text-foreground">
        <span v-if="tag.datum === heute" class="rounded-sm bg-foreground px-1.5 text-xs font-medium text-background">{{ texte.heute }}</span>
        {{ formatDatum(tag.datum) }}
      </h2>
      <ul class="grid grid-cols-3 gap-2">
        <li v-for="slot in SLOTS" :key="slot" class="flex min-w-0 flex-col gap-1">
          <span class="truncate text-fine">{{ slotName(slot) }}</span>
          <div
            :style="feld(tag.slots[slot]).stil"
            :class="['flex min-h-[4.5rem] flex-1 flex-col justify-center rounded-md px-2 py-2 leading-tight', feld(tag.slots[slot]).klasse]"
          >
            <span class="whitespace-nowrap text-base font-semibold">
              <span v-if="feld(tag.slots[slot]).ost" class="sr-only">{{ texte.ostbetrieb }}: </span>{{ feld(tag.slots[slot]).haupt }}
            </span>
            <span class="text-xs">{{ feld(tag.slots[slot]).neben }}</span>
          </div>
        </li>
      </ul>
    </li>
  </ul>
</template>
