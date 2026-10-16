/**
 * Ein Abruf einer Quelle, unabhängig davon, ob sich die Richtung geändert hat. Unterscheidet Lücken durch Ausfall von einer unveränderten Richtung. Eigene Tabelle, damit observation schlank bleibt.
 */
export interface LebenszeichenEinerQuelle {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Quelle einer Betriebsrichtungs-Beobachtung. wind_estimate ist eine Schätzung aus Wind und nie eine echte Beobachtung.
   */
  source: "umwelthaus" | "fraport" | "datis" | "adsb" | "wind_estimate";
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  checked_at: string;
  /**
   * ok: Abruf gelungen, error: Quelle nicht erreichbar oder Format unbekannt, empty: Abruf gelungen, aber ohne Angabe.
   */
  status: "ok" | "error" | "empty";
  detail?: string | null;
}
