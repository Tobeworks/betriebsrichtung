/**
 * Eine Prognose für ein Zeitfenster aus einem Lauf und einem Modell. Jede Berechnung ist eine neue Zeile, niemals überschrieben, sonst ist keine Auswertung nach Vorlaufzeit möglich. Regel: window_end ist größer als window_start, p_east_raw ist die unkalibrierte Wahrscheinlichkeit, p_east die ausgelieferte.
 */
export interface PrognoseJeZeitfenster {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Verweis auf den Prognoselauf.
   */
  run_id: number;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_end: string;
  /**
   * Lokaler Kalendertag in Europe/Berlin, bestimmt im Backend.
   */
  local_date: string;
  /**
   * morning 06 bis 14 Uhr, afternoon 14 bis 22 Uhr, night 22 bis 06 Uhr des Folgetages, jeweils Lokalzeit. night gehört zum Kalendertag, an dem es beginnt.
   */
  slot: "morning" | "afternoon" | "night";
  /**
   * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
   */
  model: string;
  /**
   * Unkalibrierte Ostwahrscheinlichkeit aus den Ensemble-Mitgliedern.
   */
  p_east_raw: number;
  /**
   * Ausgelieferte Ostwahrscheinlichkeit, nach Kalibrierung und Begrenzung. Gleich p_east_raw, solange calibrated false ist.
   */
  p_east: number;
  /**
   * true, wenn Stufe 2 der Kalibrierung angewandt wurde.
   */
  calibrated: boolean;
  /**
   * Erwarteter Ostanteil des Fensters, für die Farbintensität im Frontend.
   */
  expected_east_share: number;
  /**
   * Anzahl der Ensemble-Läufe, die in p_east_raw eingeflossen sind.
   */
  members: number;
  /**
   * Vorlaufzeit in Stunden ab Berechnung bis Fensterbeginn.
   */
  lead_hours: number;
  /**
   * SHA-256 der normalisierten Konfigurationsdatei.
   */
  config_hash: string;
}
