export interface Abschnitt {
  titel: string;
  absaetze: string[];
  liste?: string[];
}

export const methodik: Abschnitt[] = [
  {
    titel: "Was diese Seite zeigt",
    absaetze: [
      "Die Anzeige zeigt, mit welcher Wahrscheinlichkeit am Flughafen Frankfurt in einem Zeitfenster Ostbetrieb herrscht. Bei Ostbetrieb werden Landungen auf die Landebahn Nordwest geführt, und die Anflüge gehen über Ginsheim-Gustavsburg. Im Jahresmittel ist Ostbetrieb etwa 25 bis 30 Prozent der Zeit der Fall.",
      "Die Zahl ist eine Wahrscheinlichkeit und kein Versprechen. Die Anzeige ist keine amtliche Auskunft.",
    ],
  },
  {
    titel: "Zeitfenster",
    absaetze: [
      "Jeder Tag ist in drei Zeitfenster geteilt, alle Zeiten sind Ortszeit in Deutschland.",
    ],
    liste: [
      "Vormittag: 6 bis 14 Uhr",
      "Nachmittag: 14 bis 22 Uhr",
      "Nacht: 22 bis 6 Uhr des folgenden Tages, das Nachtfenster gehört zu dem Tag, an dem es beginnt",
    ],
  },
  {
    titel: "Wie die Prognose entsteht",
    absaetze: [
      "Die Berechnung läuft in mehreren Schritten.",
    ],
    liste: [
      "Wetterdaten: Mehrere Wettermodelle (ECMWF, GFS und ICON) liefern für die nächsten 14 Tage stündlich Wind in 10 Metern Höhe. Jedes Modell rechnet viele leicht unterschiedliche Simulationen, die man Mitglieder nennt.",
      "Rückenwind: Aus Richtung und Stärke des Windes wird berechnet, wie viel davon in Richtung der Landebahn 25 weht. Kommt der Wind stark aus Osten, landet man lieber in Richtung Osten.",
      "Umschalten: Pro Mitglied wird Stunde für Stunde entschieden, ob West oder Ost gilt. Der Wechsel auf Ost passiert erst bei deutlichem Rückenwind, zurück auf West erst, wenn er wieder nachlässt. Eine Mindestdauer verhindert, dass kurze Böen ständig hin und her wechseln.",
      "Anteil im Fenster: Für jedes Mitglied wird der Anteil der Stunden mit Ostbetrieb im Zeitfenster ermittelt. Liegt er über der Hälfte, zählt das Mitglied als Ost.",
      "Wahrscheinlichkeit: Die Wahrscheinlichkeit ist der Anteil der Mitglieder, die als Ost zählen. Die Modelle werden mit Gewichten zusammengefasst. Für nahe Tage zählt das feinere Modell stärker, für ferne Tage die großen globalen Modelle.",
    ],
  },
  {
    titel: "Wie die Zahl zu lesen ist",
    absaetze: [
      "Die Zahl ist auf 5 Prozentpunkte gerundet. Werte unter 5 Prozent werden als unter 5 Prozent angezeigt, Werte über 95 Prozent als über 95 Prozent. Eine Null oder eine Hundert wird bewusst nie angezeigt.",
      "Je weiter ein Zeitfenster in der Zukunft liegt, desto unsicherer ist die Prognose. Die Vorlaufzeit steht bei jedem Eintrag.",
    ],
  },
  {
    titel: "Was noch fehlt",
    absaetze: [
      "Diese Seite beschreibt den aktuellen Stand, nicht das Endziel.",
    ],
    liste: [
      "Kalibrierung: Die Wahrscheinlichkeiten sind noch nicht anhand früherer Vergleiche nachjustiert. Sie werden roh ausgegeben.",
      "Prognosegüte: Wie gut die Prognose früher war, wird erst gemessen, sobald genug Vergleiche vorliegen. Bis dahin ist jede Angabe vorläufig.",
      "Vergangene Tage: Der tatsächliche Betrieb wird erst angezeigt, wenn eine freigegebene Quelle für die Betriebsrichtung angebunden ist.",
      "Nicht berücksichtigt sind Gewitter, tiefe Wolken, Bauarbeiten, Bahnsperrungen, Lärmpausen und Sonderfälle der Flugsicherung.",
    ],
  },
  {
    titel: "Datenquellen",
    absaetze: [
      "Wetterdaten: Open-Meteo.com, Lizenz CC BY 4.0.",
      "Winddaten am Flughafen: Meldungen der Station EDDF über aviationweather.gov.",
      "Die Betriebsrichtung selbst stammt bisher aus keiner freigegebenen Quelle. Geprüft wurde die Anbindung der Umwelthaus-Seite, sie ist aber noch nicht genutzt.",
    ],
  },
  {
    titel: "Begriffe",
    absaetze: [],
    liste: [
      "Betriebsrichtung: Die Richtung, in die gestartet und gelandet wird. West ist Bahnrichtung 25, Ost ist Bahnrichtung 07.",
      "Ensemble und Mitglieder: Viele leicht unterschiedliche Simulationen desselben Wettermodells.",
      "Vorlaufzeit: Abstand zwischen Berechnung und Beginn des Zeitfensters.",
      "Klimatologie: Der langjährige Anteil von Ostbetrieb, zum Vergleich mit der Prognose.",
      "Persistenz: Die Annahme, dass es so bleibt, wie es gerade ist.",
    ],
  },
];
