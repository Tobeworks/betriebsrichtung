/**
 * Eine Version der Prognose-Konfiguration. Jede inhaltliche Änderung erzeugt eine neue Zeile mit neuem Hash. Alte Prognosen behalten ihre Version, damit Auswertungen nach Version möglich sind. Der Inhalt entspricht forecast_config.schema.json.
 */
export interface Konfigurationsversion {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * SHA-256 der normalisierten Konfigurationsdatei.
   */
  config_hash: string;
  /**
   * Laufende Versionsnummer aus dem Feld version der Konfigurationsdatei.
   */
  version: number;
  /**
   * Vollständiger Inhalt der Konfiguration zum Zeitpunkt der Erzeugung.
   */
  content: {
    [k: string]: unknown;
  };
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  created_at: string;
  /**
   * Beschreibung der Änderung gegenüber der Vorversion.
   */
  change_note: string;
}
