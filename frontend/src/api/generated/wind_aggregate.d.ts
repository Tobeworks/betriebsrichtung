/**
 * Zusammenfassung der Ensemble-Winde eines Fensters. Richtungen werden nie arithmetisch gemittelt, die mittlere Richtung entsteht aus den Vektorkomponenten (zirkuläre Statistik). Erlaubt Neuberechnung ohne erneute Abfrage der Wetter-API.
 */
export interface WindaggregatJeZeitfenster {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  run_id: number;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_start: string;
  /**
   * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
   */
  model: string;
  /**
   * Anteil der Läufe mit Ostlage im Fenster.
   */
  east_member_share: number;
  /**
   * Mittlere Windrichtung aus Vektorkomponenten.
   */
  mean_direction_deg: number;
  /**
   * Geschwindigkeit in Knoten.
   */
  mean_speed_kn: number;
  /**
   * Mittlere Resultierende der Richtungen, 1 bedeutet einheitliche Richtung, nahe 0 bedeutet stark wechselnd.
   */
  resultant_length: number;
  /**
   * Standardabweichung der Geschwindigkeit in Knoten.
   */
  speed_sd: number;
  /**
   * 10. Perzentil der Rückenwindkomponente für West in Knoten.
   */
  tailwind_p10: number;
  /**
   * Median der Rückenwindkomponente für West in Knoten.
   */
  tailwind_p50: number;
  /**
   * 90. Perzentil der Rückenwindkomponente für West in Knoten.
   */
  tailwind_p90: number;
}
