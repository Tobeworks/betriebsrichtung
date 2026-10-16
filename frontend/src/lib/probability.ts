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
  if (wahrscheinlichkeit < 0.2) {
    return { klasse: texte.einordnung.eherWest, richtung: "west" };
  }
  if (wahrscheinlichkeit < 0.4) {
    return { klasse: texte.einordnung.tendenziellWest, richtung: "west" };
  }
  if (wahrscheinlichkeit < 0.6) {
    return { klasse: texte.einordnung.offen, richtung: "offen" };
  }
  if (wahrscheinlichkeit < 0.8) {
    return { klasse: texte.einordnung.tendenziellOst, richtung: "ost" };
  }
  return { klasse: texte.einordnung.eherOst, richtung: "ost" };
}
