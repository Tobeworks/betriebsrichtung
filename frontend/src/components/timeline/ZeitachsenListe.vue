<script setup lang="ts">
import { beschreibeEintrag, type Eintrag, slotName, type Zustand } from "../../lib/zeitachse";
import { formatDatum } from "../../lib/format";
import { texte } from "../../config/texte";

defineProps<{ eintraege: Eintrag[] }>();

const flaeche: Record<Zustand, string> = {
  west: "bg-west text-west-fg",
  ost: "bg-east text-east-fg",
  offen: "bg-muted text-foreground",
  luecke: "bg-background text-muted-foreground",
};
</script>

<template>
  <div v-if="eintraege.length === 0" class="text-fine">{{ texte.leer }}</div>
  <ul v-else class="flex flex-col gap-3" aria-label="Zeitachse">
    <li
      v-for="eintrag in eintraege"
      :key="`${eintrag.local_date}-${eintrag.slot}-${eintrag.status}`"
      class="grid grid-cols-[6rem_1fr] items-center gap-3"
    >
      <div class="flex flex-col">
        <span class="font-medium text-foreground">{{ formatDatum(eintrag.local_date) }}</span>
        <span class="text-fine">{{ slotName(eintrag.slot) }}</span>
      </div>
      <div
        :class="[
          'touch-target flex min-h-[3rem] items-center rounded-md px-4 py-2 font-medium',
          flaeche[beschreibeEintrag(eintrag).zustand],
          beschreibeEintrag(eintrag).zustand === 'luecke' ? 'border-[0.0625rem] border-dashed border-border' : '',
        ]"
      >
        {{ beschreibeEintrag(eintrag).text }}
      </div>
    </li>
  </ul>
</template>
