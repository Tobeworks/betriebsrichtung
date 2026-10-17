<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
import GithubIcon from "./components/layout/GithubIcon.vue";
import SiteNav from "./components/layout/SiteNav.vue";
import { site } from "./config/site";
import { texte } from "./config/texte";

const version = __APP_VERSION__;
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <a
      href="#main-content"
      class="sr-only rounded-md bg-background px-4 py-2 text-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      {{ texte.sprungziel }}
    </a>

    <header class="hairline border-x-0 border-t-0 pt-[env(safe-area-inset-top)]">
      <div class="page-container flex items-center justify-between gap-4 py-3">
        <RouterLink to="/" class="touch-target inline-flex items-center gap-2 font-semibold text-foreground">
          {{ site.name }}
          <span class="text-fine font-normal">v{{ version }}</span>
        </RouterLink>
        <SiteNav variante="oben" />
      </div>
    </header>

    <main id="main-content" tabindex="-1" class="page-container flex-1 py-6 pb-24 focus:outline-none md:pb-10">
      <RouterView />
    </main>

    <SiteNav variante="unten" />

    <footer class="hairline border-x-0 border-b-0 pb-28 md:pb-6">
      <div class="page-container flex flex-col gap-3 py-6">
        <p class="text-fine">
          {{ texte.haftung }}
          <RouterLink to="/methodik" class="underline underline-offset-4">{{ texte.zurMethodik }}</RouterLink>
        </p>
        <nav aria-label="Rechtliches" class="flex flex-wrap gap-x-6 gap-y-2 text-fine">
          <RouterLink to="/impressum" class="touch-target inline-flex items-center underline underline-offset-4">
            {{ texte.impressum }}
          </RouterLink>
          <RouterLink to="/datenschutz" class="touch-target inline-flex items-center underline underline-offset-4">
            {{ texte.datenschutz }}
          </RouterLink>
          <RouterLink to="/status" class="touch-target inline-flex items-center underline underline-offset-4">
            {{ texte.status }}
          </RouterLink>
        </nav>
        <p class="text-fine">
          {{ site.name }}, Version {{ version }},
          <a href="https://tobeworks.de" class="underline underline-offset-4">Tobeworks</a>
        </p>
        <a
          href="https://github.com/Tobeworks/betriebsrichtung"
          class="touch-target inline-flex w-fit items-center gap-2 text-fine underline underline-offset-4"
        >
          <GithubIcon />
          <span>{{ texte.quellcode }}</span>
        </a>
      </div>
    </footer>
  </div>
</template>
