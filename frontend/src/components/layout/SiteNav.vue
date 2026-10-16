<script setup lang="ts">
import { BookOpen, CalendarDays, ChartLine, Target } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { texte } from "../../config/texte";

defineProps<{ variante: "oben" | "unten" }>();

const links = [
  { to: "/", label: texte.navVerlauf, icon: CalendarDays },
  { to: "/statistik", label: texte.navStatistik, icon: ChartLine },
  { to: "/prognosegute", label: texte.navGuete, icon: Target },
  { to: "/methodik", label: texte.navMethodik, icon: BookOpen },
];
</script>

<template>
  <nav
    v-if="variante === 'oben'"
    aria-label="Hauptnavigation"
    class="hidden gap-2 md:flex"
  >
    <RouterLink
      v-for="link in links"
      :key="link.to"
      :to="link.to"
      class="touch-target inline-flex items-center gap-2 rounded-md px-3 text-muted-foreground hover:text-foreground"
      active-class="font-semibold text-foreground"
    >
      <component :is="link.icon" class="size-5" aria-hidden="true" />
      <span>{{ link.label }}</span>
    </RouterLink>
  </nav>
  <nav
    v-else
    aria-label="Hauptnavigation"
    class="fixed inset-x-0 bottom-0 z-40 border-t-hairline bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
  >
    <ul class="mx-auto flex max-w-[60rem] justify-around">
      <li v-for="link in links" :key="link.to" class="flex-1">
        <RouterLink
          :to="link.to"
          class="touch-target flex min-h-[3.5rem] flex-col items-center justify-center gap-1 px-1 py-2 text-[0.875rem] text-muted-foreground"
          active-class="font-semibold text-foreground"
        >
          <component :is="link.icon" class="size-6" aria-hidden="true" />
          <span>{{ link.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
