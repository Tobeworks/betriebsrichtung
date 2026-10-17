<script setup lang="ts">
import RechtsSeite from "../components/layout/RechtsSeite.vue";
import { impressum } from "../config/rechtliches";
import { texte } from "../config/texte";
</script>

<template>
  <RechtsSeite :titel="texte.impressum" :abschnitte="impressum" />
</template>
