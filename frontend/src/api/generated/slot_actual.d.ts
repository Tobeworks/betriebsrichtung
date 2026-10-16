/**
 * Die Wahrheit eines Zeitfensters, aus den Beobachtungen abgeleitet. Ein Fenster ist Ost, wenn east_share größer als 0,5 ist. Ist observed_share unter 0,7, lautet truth gap. Frontend und Auswertung nutzen dieselbe Wahrheit. Neuberechnung bei nachgetragenen Daten ist erlaubt, daher computed_at.
 */
export interface TatsachlicheBetriebsrichtungJeZeitfenster {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Lokaler Kalendertag in Europe/Berlin, bestimmt im Backend.
   */
  local_date: string;
  /**
   * morning 06 bis 14 Uhr, afternoon 14 bis 22 Uhr, night 22 bis 06 Uhr des Folgetages, jeweils Lokalzeit. night gehört zum Kalendertag, an dem es beginnt.
   */
  slot: "morning" | "afternoon" | "night";
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_end: string;
  /**
   * Zeitanteil mit Ostbetrieb innerhalb des beobachteten Teils.
   */
  east_share: number;
  /**
   * Zeitanteil des Fensters, der durch Beobachtungen abgedeckt ist.
   */
  observed_share: number;
  /**
   * Wahrheit eines Zeitfensters. gap bedeutet, weniger als 70 Prozent des Fensters sind beobachtet, das Fenster fließt in keine Statistik ein.
   */
  truth: "east" | "west" | "gap";
  /**
   * Maßgebliche Quelle, null wenn truth gap ist.
   */
  source: ("umwelthaus" | "fraport" | "datis" | "adsb" | "wind_estimate") | null;
  /**
   * observed für echte Beobachtung, estimated für aus Wind abgeleitete Werte.
   */
  quality: "observed" | "estimated";
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  computed_at: string;
}
