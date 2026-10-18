<script setup lang="ts">
import { holeGuete } from "../api/client";
import { texte } from "../config/texte";
import { useLaden } from "../composables/useLaden";
import { ganzProzent } from "../lib/format";

const TAGE = 90;
const WENIG = 20;

const { daten, laedt, fehler, laden } = useLaden((signal) => holeGuete(TAGE, signal));

function klasse(name: string): string {
  return texte.guete.klassen[name as keyof typeof texte.guete.klassen];
}

function zahl(wert: number | null): string {
  return wert === null ? "-" : wert.toFixed(2).replace(".", ",");
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <header class="flex flex-col gap-2">
      <p class="section-eyebrow">{{ texte.guete.untertitel }}</p>
      <h1 tabindex="-1" class="heading-page">{{ texte.navGuete }}</h1>
      <p class="max-w-[40rem] leading-[1.6]">{{ texte.guete.einleitung }}</p>
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

    <p v-else-if="!daten || daten.windows === 0" class="text-fine">{{ texte.guete.leer }}</p>

    <template v-else>
      <p class="rounded-md bg-warning p-3 text-warning-fg">
        Vorläufig: {{ daten.windows }} Fenster verglichen.
        <template v-if="(daten.estimated_share ?? 0) > 0">
          {{ ganzProzent(daten.estimated_share ?? 0) }} davon stützen sich auf eine aus Messwind geschätzte Wahrheit, nicht auf die tatsächlich geflogene Richtung.
        </template>
      </p>

      <ul class="flex flex-col gap-3" aria-label="Trefferquote nach Vorlaufzeit">
        <li v-for="k in daten.classes" :key="k.lead_class" class="flex flex-col gap-2 rounded-lg border-[0.0625rem] border-border p-4">
          <div class="flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 class="heading-section">{{ klasse(k.lead_class) }}</h2>
            <span class="text-fine">
              <template v-if="k.comparisons === 0">{{ texte.guete.keineVergleiche }}</template>
              <template v-else>{{ k.comparisons }} {{ texte.guete.vergleiche }}<template v-if="k.comparisons < WENIG">, {{ texte.guete.wenige }}</template></template>
            </span>
          </div>
          <template v-if="k.comparisons > 0">
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-foreground"><span>{{ texte.guete.prognose }}</span><span class="font-semibold">{{ ganzProzent(k.hit_rate ?? 0) }}</span></div>
              <div class="h-4 overflow-hidden rounded-md bg-muted" aria-hidden="true"><div class="h-full bg-east" :style="{ width: `${(k.hit_rate ?? 0) * 100}%` }" /></div>
            </div>
            <div class="flex flex-col gap-1">
              <div class="flex justify-between text-foreground"><span>{{ texte.guete.immerWest }}</span><span class="font-semibold">{{ ganzProzent(k.hit_rate_west ?? 0) }}</span></div>
              <div class="h-4 overflow-hidden rounded-md bg-muted" aria-hidden="true"><div class="h-full bg-west" :style="{ width: `${(k.hit_rate_west ?? 0) * 100}%` }" /></div>
            </div>
          </template>
        </li>
      </ul>

      <details class="rounded-lg border-[0.0625rem] border-border p-4">
        <summary class="touch-target cursor-pointer font-medium">{{ texte.guete.erklaerung }}</summary>
        <div class="mt-3 flex flex-col gap-3">
          <p class="leading-[1.6]">{{ texte.guete.trefferErklaerung }}</p>
          <p class="leading-[1.6]">{{ texte.guete.brierErklaerung }}</p>
          <table class="w-full text-left">
            <thead>
              <tr class="text-fine">
                <th class="py-1 pr-2 font-medium">&nbsp;</th>
                <th class="py-1 pr-2 font-medium">{{ texte.guete.brier }}</th>
                <th class="py-1 font-medium">{{ texte.guete.skill }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="k in daten.classes" :key="k.lead_class">
                <th class="py-1 pr-2 font-normal">{{ klasse(k.lead_class) }}</th>
                <td class="py-1 pr-2">{{ zahl(k.brier) }} ({{ texte.guete.immerWest }} {{ zahl(k.brier_west) }})</td>
                <td class="py-1">{{ zahl(k.skill_west) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </template>
  </section>
</template>
