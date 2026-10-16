<script setup lang="ts">
import { texte } from "../../config/texte";

defineProps<{ titel: string; untertitel?: string; text?: string }>();
</script>

<template>
  <section class="flex flex-col gap-4">
    <header class="flex flex-col gap-2">
      <p v-if="untertitel" class="section-eyebrow">{{ untertitel }}</p>
      <h1 tabindex="-1" class="heading-page">{{ titel }}</h1>
    </header>
    <p class="text-fine">{{ text ?? texte.inArbeit }}</p>
  </section>
</template>
