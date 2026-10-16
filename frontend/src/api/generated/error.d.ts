/**
 * Einheitliche Fehlerantwort aller Betriebsrichtungs-Endpunkte. Die Meldung ist deutsch und für Menschen gedacht, code ist maschinenlesbar. Ein Stacktrace wird nie ausgeliefert. Eine Lücke im Datensatz ist kein Fehler, sondern der Status gap.
 */
export interface Fehlerantwort {
  /**
   * Immer 0 bei Fehlern, wie im Bestand der API.
   */
  status: 0;
  /**
   * Deutsche Meldung.
   */
  error: string;
  /**
   * Maschinenlesbarer Code, zum Beispiel ZEITRAUM_ZU_GROSS.
   */
  code: string;
}
