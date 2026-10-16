/**
 * Alle Parameter der Prognose, Datei jobs/config/forecast.json. Regeln, die ein Schema nicht ausdrückt: west_back_tailwind_kn liegt unter east_on_tailwind_kn. In models ist jede id nur einmal erlaubt. Der Hash der normalisierten Datei wird in jedem Prognoselauf gespeichert.
 */
export interface PrognoseKonfiguration {
  /**
   * Version dieses Schemas.
   */
  schema: 1;
  /**
   * Version der Konfiguration, bei jeder inhaltlichen Änderung erhöhen.
   */
  version: number;
  airport: {
    /**
     * ICAO-Code des Flughafens, EDDF.
     */
    icao: string;
    latitude: number;
    longitude: number;
  };
  axis: {
    /**
     * Landerichtung Ost, Parallelbahnen 070.
     */
    east_landing_deg: number;
    /**
     * Landerichtung West, Parallelbahnen 250.
     */
    west_landing_deg: number;
  };
  decision: {
    /**
     * Wechsel von West auf Ost, wenn die Rückenwindkomponente für West größer ist.
     */
    east_on_tailwind_kn: number;
    /**
     * Rückwechsel von Ost auf West, wenn die Rückenwindkomponente kleiner ist (Hysterese).
     */
    west_back_tailwind_kn: number;
    /**
     * Gleitendes Mittel der Rückenwindkomponente in Stunden.
     */
    smoothing_hours: number;
    /**
     * Mindestverweildauer in Stunden.
     */
    min_dwell_hours: number;
    /**
     * Anteil, ab dem ein Fenster als Ost gilt. Startwert 0,5.
     */
    slot_majority: number;
  };
  /**
   * Modelle für die gewichtete Mischung. Gewichte je Vorlaufklasse, 0 bedeutet nicht verwendet.
   *
   * @minItems 1
   */
  models: [
    {
      /**
       * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
       */
      id: string;
      weights: {
        d0_2: number;
        d3_7: number;
        d8_14: number;
      };
    },
    ...{
      /**
       * Open-Meteo Modell-ID, zum Beispiel ecmwf_ifs025, oder blend für die gewichtete Mischung.
       */
      id: string;
      weights: {
        d0_2: number;
        d3_7: number;
        d8_14: number;
      };
    }[]
  ];
  calibration: {
    /**
     * Verfahren der Kalibrierung Stufe 2, none bis genug Vergleiche vorliegen.
     */
    method: "none" | "platt" | "isotonic";
    /**
     * Mindestzahl an Vergleichen je Vorlaufklasse, Startwert 150.
     */
    min_samples: number;
  };
  limits: {
    probability_min: number;
    probability_max: number;
  };
}
