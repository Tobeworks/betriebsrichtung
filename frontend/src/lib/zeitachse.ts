import type { AntwortZeitachse } from "../api/generated/timeline.response";
import { texte } from "../config/texte";
import { einordnen, prozentText, type Richtung, type Teilung, teilung } from "./probability";

export type Eintrag = AntwortZeitachse["items"][number];

export type Zustand = Richtung | "luecke";

export interface Beschreibung {
  zustand: Zustand;
  text: string;
  aussage: string;
  herkunft: string;
  teilung?: Teilung;
  ostAnteil?: number;
  prognose?: boolean;
  gemischt?: boolean;
}

export function slotName(slot: string): string {
  if (slot === "morning") {
    return texte.vormittag;
  }
  if (slot === "afternoon") {
    return texte.nachmittag;
  }
  return texte.nacht;
}

export function beschreibeEintrag(eintrag: Eintrag): Beschreibung {
  if (eintrag.status === "forecast") {
    const einordnung = einordnen(eintrag.p_east);
    return {
      zustand: einordnung.richtung,
      text: `${einordnung.klasse}, Ostbetrieb ${prozentText(eintrag.p_east)}`,
      aussage: einordnung.klasse,
      herkunft: texte.prognose,
      teilung: teilung(eintrag.p_east),
      ostAnteil: eintrag.p_east,
      prognose: true,
    };
  }
  if (eintrag.status === "estimated" && eintrag.east_share !== null) {
    // Aus Messwind geschätzt: als Anteil zeigen, nicht als Ost oder West. Die DFS entscheidet im Zwischenband nicht allein nach Wind.
    const einordnung = einordnen(eintrag.east_share);
    return {
      zustand: einordnung.richtung,
      text: `${texte.geschaetzt}, Ostbetrieb ${prozentText(eintrag.east_share)}`,
      aussage: einordnung.klasse,
      herkunft: texte.geschaetzt,
      teilung: teilung(eintrag.east_share),
      ostAnteil: eintrag.east_share,
    };
  }
  if (eintrag.status === "running") {
    // Laufendes Fenster: bisher bekannter Teil aus Messwind, Rest aus der Prognose. Ohne bekannten Teil ist es reine Prognose.
    const einordnung = einordnen(eintrag.east_share);
    const mitMesswerten = eintrag.actual_share > 0;
    return {
      zustand: einordnung.richtung,
      text: `${einordnung.klasse}, Ostbetrieb ${prozentText(eintrag.east_share)}${mitMesswerten ? `, ${texte.gemischt}` : ""}`,
      aussage: einordnung.klasse,
      herkunft: mitMesswerten ? texte.gemischt : texte.prognose,
      teilung: teilung(eintrag.east_share),
      ostAnteil: eintrag.east_share,
      gemischt: mitMesswerten,
      prognose: !mitMesswerten,
    };
  }
  if (eintrag.status === "gap" || eintrag.runway_direction === null) {
    return { zustand: "luecke", text: texte.keineDaten, aussage: "–", herkunft: texte.keineDaten };
  }
  const richtung = eintrag.runway_direction === "east" ? texte.ost : texte.west;
  const herkunft = eintrag.status === "estimated" ? texte.geschaetzt : texte.beobachtet;
  return {
    zustand: eintrag.runway_direction === "east" ? "ost" : "west",
    text: `${richtung}, ${herkunft}`,
    aussage: richtung,
    herkunft,
  };
}

export interface Tageseintrag {
  datum: string;
  slots: Partial<Record<Eintrag["slot"], Eintrag>>;
}

export function nachTagen(eintraege: Eintrag[]): Tageseintrag[] {
  const tage = new Map<string, Tageseintrag>();
  for (const eintrag of eintraege) {
    const tag = tage.get(eintrag.local_date) ?? { datum: eintrag.local_date, slots: {} };
    tag.slots[eintrag.slot] = eintrag;
    tage.set(eintrag.local_date, tag);
  }
  return [...tage.values()].sort((a, b) => a.datum.localeCompare(b.datum));
}
