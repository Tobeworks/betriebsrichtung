/**
 * Ein Lauf des Forecast-Jobs. Idempotenz über Lauf-Slot (Datum und laufende Nummer). Ein wiederholter Lauf mit gleichem Slot dupliziert nichts. Alle Forecast- und WindAggregate-Zeilen eines Laufs werden in einer Transaktion geschrieben.
 */
export interface Prognoselauf {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Lokaler Kalendertag des Laufs, Teil des Idempotenzschlüssels.
   */
  run_date: string;
  /**
   * Laufende Nummer am Tag, Teil des Idempotenzschlüssels.
   */
  run_seq: number;
  /**
   * SHA-256 der normalisierten Konfigurationsdatei.
   */
  config_hash: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  computed_at: string;
  /**
   * partial bedeutet, ein Modell fehlte und die Gewichte wurden neu verteilt.
   */
  status: "ok" | "partial" | "failed";
  duration_ms: number;
  /**
   * Je Modell der Initialisierungszeitpunkt des Modelllaufs und die Anzahl der Mitglieder.
   *
   * @minItems 1
   */
  models: [
    {
      /**
       * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
       */
      model: string;
      /**
       * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
       */
      init_time: string;
      members: number;
    },
    ...{
      /**
       * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
       */
      model: string;
      /**
       * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
       */
      init_time: string;
      members: number;
    }[]
  ];
}
