/**
 * Eine Meldung einer Quelle zur Betriebsrichtung. Gespeichert wird nur bei Wechsel, Lebenszeichen liegen in source_heartbeat. Aus diesen Einträgen leitet der Slot-Job slot_actual ab. Eine Lücke in der Beobachtung ist nie Westbetrieb.
 */
export interface Beobachtung {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Zeitpunkt, ab dem die Quelle diese Richtung meldet.
   */
  observed_at: string;
  /**
   * east ist Ostbetrieb (Bahnrichtung 07), west ist Westbetrieb (Bahnrichtung 25).
   */
  runway_direction: "east" | "west";
  /**
   * Quelle einer Betriebsrichtungs-Beobachtung. wind_estimate ist eine Schätzung aus Wind und nie eine echte Beobachtung.
   */
  source: "umwelthaus" | "fraport" | "datis" | "adsb" | "wind_estimate";
  /**
   * Zeitpunkt, zu dem der Eintrag gespeichert wurde.
   */
  recorded_at: string;
  /**
   * Freitext zur Herkunft, bei wind_estimate die Unterquelle.
   */
  detail?: string | null;
}
