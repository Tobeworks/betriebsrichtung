/**
 * Gemessener oder gespeicherter Wind an einer Station. Grundlage für die Kalibrierung Stufe 1. Die Richtung der Betriebsrichtung wird daraus nicht übernommen, sie entsteht erst in der Ableitung (Plan 4b).
 */
export interface Winddatenreihe {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  observed_at: string;
  /**
   * Windgeschwindigkeit in Knoten.
   */
  speed_kn: number;
  /**
   * Windrichtung in Grad, null bei wechselndem Wind (VRB) oder Windstille.
   */
  direction_deg: number | null;
  /**
   * Quelle einer Winddatenreihe. era5 ist Reanalyse und gilt als Schätzung.
   */
  source: "metar" | "dwd" | "iem_asos" | "era5";
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  recorded_at: string;
}
