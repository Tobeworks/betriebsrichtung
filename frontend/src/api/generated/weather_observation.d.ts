/**
 * Gemessenes Wetter an einer Station neben dem Wind (wind_observation, gleicher Zeitpunkt und gleiche Quelle). Dient der Einordnung: Welches Wetter herrschte in Zeiträumen mit Ost oder West. Das Wetter erklärt die Richtung nicht, die DFS entscheidet nach mehr als dem Wetter am Boden. Fehlt eine Angabe in der Meldung, ist sie null.
 */
export interface Wetterbeobachtung {
  /**
   * Primärschlüssel, vergibt die Datenbank.
   */
  id?: number;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  observed_at: string;
  /**
   * Quelle einer Winddatenreihe. era5 ist Reanalyse und gilt als Schätzung.
   */
  source: "metar" | "dwd" | "iem_asos" | "era5";
  /**
   * Lufttemperatur in Grad Celsius.
   */
  temperature_c: number | null;
  /**
   * Taupunkt in Grad Celsius.
   */
  dewpoint_c: number | null;
  /**
   * Luftdruck auf Meereshöhe (QNH) in Hektopascal.
   */
  pressure_hpa: number | null;
  /**
   * Windböe in Knoten, null ohne Böenangabe.
   */
  gust_kn: number | null;
  /**
   * Hauptsicht in Metern, 9999 steht für 10 Kilometer und mehr (auch CAVOK).
   */
  visibility_m: number | null;
  /**
   * Untergrenze der untersten durchbrochenen oder geschlossenen Wolkenschicht (BKN, OVC) in Fuß über Grund, null ohne eine solche Schicht.
   */
  ceiling_ft: number | null;
  /**
   * true bei Niederschlag in der Meldung (Regen, Nieselregen, Schnee, Hagel und ähnliche).
   */
  precipitation: boolean;
  /**
   * true bei Gewitter in der Meldung (TS).
   */
  thunderstorm: boolean;
  /**
   * Wettererscheinungen der Meldung als Text, zum Beispiel -RA oder BR, null ohne Angabe.
   */
  phenomena: string | null;
  /**
   * Zeitpunkt in UTC nach ISO 8601 mit Suffix Z.
   */
  recorded_at: string;
}
