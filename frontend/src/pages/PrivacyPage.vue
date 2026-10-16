<script setup lang="ts">
import PlatzhalterSeite from "../components/layout/PlatzhalterSeite.vue";
import { texte } from "../config/texte";
</script>

<template>
  <PlatzhalterSeite :titel="texte.datenschutz" :text="texte.datenschutzText" />
</template>
