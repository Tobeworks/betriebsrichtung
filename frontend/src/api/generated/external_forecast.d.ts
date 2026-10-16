/**
 * Aussage einer externen Prognose, nur zur Qualitätsmessung und nie ausgeliefert. Nur anlegen, wenn der Betreiber die Speicherung erlaubt (Plan Frage 10). Bei statement direction ist direction gesetzt, bei probability ist probability gesetzt.
 */
export type FremdePrognose = {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  source: "umwelthaus";
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  fetched_at: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_start: string;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  window_end: string;
  statement: "direction" | "probability";
  /**
   * Aussage als Betriebsrichtung, bei statement direction.
   */
  direction: ("east" | "west") | null;
  /**
   * Aussage als Ostwahrscheinlichkeit, bei statement probability.
   */
  probability: number | null;
};
