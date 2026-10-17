<script setup lang="ts">
import RechtsSeite from "../components/layout/RechtsSeite.vue";
import { datenschutz } from "../config/rechtliches";
import { texte } from "../config/texte";
</script>

<template>
  <RechtsSeite :titel="texte.datenschutz" :abschnitte="datenschutz" />
</template>
