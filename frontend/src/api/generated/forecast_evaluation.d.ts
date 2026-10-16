/**
 * Gütemaße einer Vorlaufklasse, eines Zeitfensters und eines Zeitraums, jeweils gegen die Baselines West, Klimatologie und Persistenz. Skill-Werte sind positiv, wenn die Prognose besser ist als die Baseline. Mit weniger als 30 Vergleichen wird keine Kennzahl angezeigt, provisional ist true, solange die Datenmenge gering ist.
 */
export interface AuswertungDerPrognosegute {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Vorlaufklasse. Die Grenzen der Klassen sind Obergrenzen, die Beschriftung nennt den Vorlauf ab Fensterbeginn.
   */
  lead_class: "1_tag" | "2_3_tage" | "4_7_tage" | "8_14_tage";
  /**
   * Vorlauftag 1 bis 14 für die Unsicherheitsgrenze, null bei Klassenwerten.
   */
  lead_day: number | null;
  /**
   * Ein Zeitfenster oder alle Fenster zusammen.
   */
  window_kind: "morning" | "afternoon" | "night" | "all";
  period: "rolling_90d" | "all";
  /**
   * SHA-256 der normalisierten Konfigurationsdatei.
   */
  config_hash: string;
  /**
   * Anzahl der Vergleiche in diesem Ausschnitt.
   */
  comparisons: number;
  /**
   * Trefferquote bei Schwelle 0,5, null bei zu wenigen Vergleichen.
   */
  hit_rate: number | null;
  /**
   * Brier-Score, null bei zu wenigen Vergleichen.
   */
  brier: number | null;
  /**
   * Brier Skill Score gegen immer West, null bei zu wenigen Vergleichen.
   */
  skill_west: number | null;
  /**
   * Brier Skill Score gegen die Klimatologie, null bei zu wenigen Vergleichen.
   */
  skill_climatology: number | null;
  /**
   * Brier Skill Score gegen die Persistenz, null bei zu wenigen Vergleichen.
   */
  skill_persistence: number | null;
  /**
   * Untere Grenze des Bootstrap-Konfidenzintervalls für den Brier-Score (Blöcke über ganze Tage), null wenn nicht berechnet.
   */
  ci_low: number | null;
  /**
   * Obere Grenze des Bootstrap-Konfidenzintervalls für den Brier-Score, null wenn nicht berechnet.
   */
  ci_high: number | null;
  /**
   * Reliability-Klassen zu 10 Prozent Breite. Vorhergesagte Mitte gegen beobachtete Häufigkeit.
   */
  reliability: {
    /**
     * Anteil von 0 bis 1.
     */
    bin_low: number;
    /**
     * Anteil von 0 bis 1.
     */
    bin_high: number;
    /**
     * Anteil von 0 bis 1.
     */
    predicted_mean: number;
    /**
     * Anteil von 0 bis 1.
     */
    observed_share: number;
    n: number;
  }[];
  /**
   * true bei geringer Datenmenge, dann wird das Ergebnis als vorläufig gekennzeichnet.
   */
  provisional: boolean;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  computed_at: string;
}
