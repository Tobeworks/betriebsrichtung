/**
 * Ein Lauf eines Jobs. Grundlage der Statusseite und des Frische-Wächters. Regel: finished_at ist nicht vor started_at, bei status running fehlt finished_at.
 */
export interface Jobprotokoll {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Name des Jobs, zum Beispiel observation_logger oder forecast.
   */
  job_name: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  started_at: string;
  /**
   * Ende des Laufs, null solange der Lauf läuft.
   */
  finished_at: string | null;
  /**
   * Status eines Jobs.
   */
  status: "running" | "ok" | "partial" | "failed";
  rows_read: number;
  rows_written: number;
  error_text: string | null;
  job_version: string;
  /**
   * Korrelations-ID des Laufs, erscheint in allen Logzeilen dieses Laufs.
   */
  correlation_id: string;
}
