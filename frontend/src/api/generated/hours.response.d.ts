/**
 * Für GET /betriebsrichtung/v1/hours: der geschätzte Ostzustand je volle UTC-Stunde aus gemessenem Wind. Grundlage für die Auswertung nach Mehrheit der Stunden in der Statistik. Eine Stunde ist entweder Ost (1) oder West (0), nie eine Mischung.
 */
export interface AntwortStunden {
  schema: 1;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  generated_at: string;
  days: number;
  hours: {
    /**
     * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
     */
    start: string;
    east: 0 | 1;
  }[];
}
