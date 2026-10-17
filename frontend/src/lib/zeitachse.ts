import type { AntwortZeitachse } from "../api/generated/timeline.response";
import { texte } from "../config/texte";
import { einordnen, prozentText, type Richtung } from "./probability";

export type Eintrag = AntwortZeitachse["items"][number];

export type Zustand = Richtung | "luecke";

export interface Beschreibung {
  zustand: Zustand;
  text: string;
  haupt: string;
  neben: string;
  ostAnteil?: number;
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
      haupt: prozentText(eintrag.p_east),
      neben: einordnung.klasse,
      ostAnteil: eintrag.p_east,
    };
  }
  if (eintrag.status === "gap" || eintrag.runway_direction === null) {
    return { zustand: "luecke", text: texte.keineDaten, haupt: "–", neben: texte.keineDaten };
  }
  const richtung = eintrag.runway_direction === "east" ? texte.ost : texte.west;
  const herkunft = eintrag.status === "estimated" ? texte.geschaetzt : texte.beobachtet;
  return {
    zustand: eintrag.runway_direction === "east" ? "ost" : "west",
    text: `${richtung}, ${herkunft}`,
    haupt: richtung,
    neben: herkunft,
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
