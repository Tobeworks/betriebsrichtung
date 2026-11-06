/**
 * Für GET /betriebsrichtung/v1/weather: Wetter in den abgelaufenen Zeitfenstern, getrennt nach der Richtung des Fensters (Wahrheit, beobachtet oder aus Messwind geschätzt). Mittelwerte über alle Meldungen der Fenster. Das ist eine Einordnung und keine Begründung der Betriebsrichtung.
 */
export interface AntwortWetterBeiOstUndWest {
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
   * Ältester Tag mit gespeichertem Wetter, null ohne Wetterdaten.
   */
  weather_since: string | null;
  /**
   * Anteil der Fenster, deren Richtung aus Messwind geschätzt ist, null ohne Fenster.
   */
  estimated_share: number | null;
  groups: {
    /**
     * east ist Ostbetrieb (Bahnrichtung 07), west ist Westbetrieb (Bahnrichtung 25).
     */
    direction: "east" | "west";
    /**
     * Fenster dieser Richtung mit mindestens einer Wettermeldung.
     */
    windows: number;
    /**
     * Anzahl der Wettermeldungen in diesen Fenstern.
     */
    observations: number;
    wind_speed_kn: number | null;
    /**
     * Mittlere Windrichtung, vektoriell gemittelt.
     */
    wind_direction_deg: number | null;
    temperature_c: number | null;
    pressure_hpa: number | null;
    visibility_km: number | null;
    precipitation_share: number | null;
    /**
     * Anteil der Meldungen mit Wolkenuntergrenze unter 1000 Fuß.
     */
    low_ceiling_share: number | null;
    thunderstorm_share: number | null;
  }[];
}
