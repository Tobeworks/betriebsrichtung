import type { Eintrag } from "./zeitachse";

export type Herkunft = "geschaetzt" | "beobachtet" | "prognose";

export interface Aktuell {
  richtung: "ost" | "west" | null;
  herkunft: Herkunft | null;
}

const KEINE: Aktuell = { richtung: null, herkunft: null };

function ausEintrag(eintrag: Eintrag): Aktuell {
  if (eintrag.status === "forecast") {
    return { richtung: eintrag.p_east >= 0.5 ? "ost" : "west", herkunft: "prognose" };
  }
  if (eintrag.status === "running") {
    if (eintrag.latest_direction !== null) {
      return { richtung: eintrag.latest_direction === "east" ? "ost" : "west", herkunft: "geschaetzt" };
    }
    return { richtung: eintrag.east_share >= 0.5 ? "ost" : "west", herkunft: "prognose" };
  }
  if (eintrag.status === "gap" || eintrag.runway_direction === null) {
    return KEINE;
  }
  return {
    richtung: eintrag.runway_direction === "east" ? "ost" : "west",
    herkunft: eintrag.status === "estimated" ? "geschaetzt" : "beobachtet",
  };
}

// Das laufende Fenster, sonst die zuletzt begonnene Wahrheit. Eine Prognose zählt nur für das laufende Fenster.
export function aktuelleRichtung(eintraege: Eintrag[], jetzt: number): Aktuell {
  const laufend = eintraege.find((e) => Date.parse(e.start) <= jetzt && jetzt < Date.parse(e.end));
  const ausLaufend = laufend ? ausEintrag(laufend) : KEINE;
  if (ausLaufend.richtung) {
    return ausLaufend;
  }
  const davor = eintraege
    .filter((e) => Date.parse(e.start) <= jetzt && e.status !== "forecast" && e.status !== "running")
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
    .map(ausEintrag)
    .find((a) => a.richtung);
  return davor ?? KEINE;
}
