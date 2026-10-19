import { texte } from "../config/texte";

export type Richtung = "west" | "ost" | "offen";

export interface Einordnung {
  klasse: string;
  richtung: Richtung;
}

export function prozentText(wahrscheinlichkeit: number): string {
  if (wahrscheinlichkeit < 0.05) {
    return "unter 5 %";
  }
  if (wahrscheinlichkeit > 0.95) {
    return "über 95 %";
  }
  return `${Math.round(wahrscheinlichkeit * 20) * 5} %`;
}

export function einordnen(wahrscheinlichkeit: number): Einordnung {
  // Nur der Übergangsbereich von 25 bis 75 Prozent trägt Zusätze wie tendenziell oder offen.
  if (wahrscheinlichkeit < 0.25) {
    return { klasse: texte.einordnung.west, richtung: "west" };
  }
  if (wahrscheinlichkeit < 0.4) {
    return { klasse: texte.einordnung.tendenziellWest, richtung: "west" };
  }
  if (wahrscheinlichkeit < 0.6) {
    return { klasse: texte.einordnung.offen, richtung: "offen" };
  }
  if (wahrscheinlichkeit < 0.75) {
    return { klasse: texte.einordnung.tendenziellOst, richtung: "ost" };
  }
  return { klasse: texte.einordnung.ost, richtung: "ost" };
}

export interface Teilung {
  ost: string;
  west: string;
  dominant: "ost" | "west" | null;
}

// Aufteilung in Ost und West, auf 5 Prozentpunkte gerundet und immer 100 zusammen. Die Richtung mit mehr Gewicht ist dominant.
// Randwerte kurz als "<5 %" und ">95 %", damit sie in den schmalen Zellen auf dem Handy in eine Zeile passen.
function teil(prozent: number): string {
  return prozent < 5 ? "<5\u00a0%" : prozent > 95 ? ">95\u00a0%" : `${prozent}\u00a0%`;
}

export function teilung(ostWahrscheinlichkeit: number): Teilung {
  const ost = Math.round(ostWahrscheinlichkeit * 20) * 5;
  return {
    ost: teil(ost),
    west: teil(100 - ost),
    dominant: ost > 50 ? "ost" : ost < 50 ? "west" : null,
  };
}

