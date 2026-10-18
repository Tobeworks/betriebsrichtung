/**
 * Prognosegüte für GET /betriebsrichtung/v1/evaluation: Vergleich der Prognosen mit der Wahrheit abgelaufener Fenster, nach Vorlaufklasse. Die Wahrheit kann aus Messwind geschätzt sein, estimated_share nennt den Anteil. hit_rate und brier gelten für die Prognose, die mit _west für die Baseline immer West.
 */
export interface AntwortPrognosegute {
  schema: 1;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  generated_at: string;
  /**
   * Betrachteter Zeitraum in Tagen bis heute.
   */
  days: number;
  /**
   * Anzahl abgelaufener Fenster mit Wahrheit und mindestens einer Prognose.
   */
  windows: number;
  /**
   * Anteil der Fenster mit Ostbetrieb, null ohne Fenster.
   */
  east_share: number | null;
  /**
   * Anteil der Fenster, deren Wahrheit aus Messwind geschätzt ist, null ohne Fenster.
   */
  estimated_share: number | null;
  classes: {
    lead_class: "1_tag" | "2_3_tage" | "4_7_tage" | "8_14_tage";
    comparisons: number;
    hit_rate: number | null;
    hit_rate_west: number | null;
    brier: number | null;
    brier_west: number | null;
    /**
     * Brier Skill Score gegen immer West, positiv ist besser als die Baseline.
     */
    skill_west: number | null;
  }[];
}
