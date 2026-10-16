/**
 * Wiederverwendete Typen aller Betriebsrichtungs-Entitäten. Diese Datei hat keine eigene Tabelle. Zeitpunkte sind immer UTC mit Suffix Z. Die Umrechnung nach Europe/Berlin passiert nur im Backend bei der Zuordnung zu Zeitfenstern und im Frontend zur Anzeige.
 */
export interface GemeinsameBausteine {
  [k: string]: unknown;
}
