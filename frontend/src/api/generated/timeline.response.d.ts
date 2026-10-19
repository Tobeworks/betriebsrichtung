/**
 * Vorberechnete Zeitachse für GET /betriebsrichtung/v1/timeline. Je Tag und Fenster die Wahrheit (observed, estimated, gap) für vergangene, eine Mischung aus bekanntem Teil und Prognose (running) für das laufende und die neueste Prognose (forecast) für künftige Fenster. Regeln: bei gap ist runway_direction null. Ein Eintrag mit status forecast trägt p_east, nie runway_direction.
 */
export interface AntwortZeitachse {
  schema: 1;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  generated_at: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  data_through: string;
  timezone: "Europe/Berlin";
  /**
   * Erster Vorlauftag, an dem die Prognose gegenüber der Klimatologie nicht mehr belastbar besser ist. Trenner im Frontend.
   */
  skill_horizon_days: number;
  /**
   * true, solange zu wenige Daten vorliegen und der Standardwert 7 gilt.
   */
  skill_horizon_provisional: boolean;
  items: (EintragWahrheit | EintragPrognose | EintragLaufend)[];
}
export interface EintragWahrheit {
  status: "observed" | "estimated" | "gap";
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
  start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  end: string;
  runway_direction: ("east" | "west") | null;
  east_share: number | null;
  source: ("umwelthaus" | "fraport" | "datis" | "adsb" | "wind_estimate") | null;
}
export interface EintragPrognose {
  status: "forecast";
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
  start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  end: string;
  /**
   * Wahrscheinlichkeit von 0 bis 1. Die Anzeige begrenzt auf 0,02 bis 0,98 (Konfiguration limits).
   */
  p_east: number;
  /**
   * Wahrscheinlichkeit von 0 bis 1. Die Anzeige begrenzt auf 0,02 bis 0,98 (Konfiguration limits).
   */
  p_east_raw: number;
  lead_hours: number;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  computed_at: string;
  members: number;
  calibrated: boolean;
}
/**
 * Fenster, das gerade läuft: der bisher bekannte Teil aus gemessenem Wind (geschätzt) und der Rest aus der zuletzt vor Beginn gerechneten Prognose, zeitgewichtet zu east_share gemischt. Wahrheit und Prognose bleiben einzeln erkennbar.
 */
export interface EintragLaufend {
  status: "running";
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
  start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  end: string;
  /**
   * Anteil von 0 bis 1.
   */
  east_share: number;
  /**
   * Anteil von 0 bis 1.
   */
  actual_share: number;
  /**
   * Ostanteil des bekannten Teils, null wenn kein Teil bekannt ist.
   */
  east_actual: number | null;
  /**
   * Prognose für das Fenster, die für den Rest gilt, null ohne Prognose.
   */
  p_east_rest: number | null;
  /**
   * Ende der letzten Stunde mit gemessenem Wind, höchstens jetzt.
   */
  known_until: string | null;
  /**
   * Geschätzte Richtung in der letzten Stunde mit gemessenem Wind, auch wenn sie vor dem Fenster liegt.
   */
  latest_direction: ("east" | "west") | null;
}
