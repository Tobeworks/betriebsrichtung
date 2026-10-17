import { lokaleZeit } from "./format";
import type { Eintrag } from "./zeitachse";

export interface Saeule {
  von: number;
  bis: number;
  ost: number;
  eintrag: Eintrag;
}

export interface Tag {
  datum: string;
  von: number;
  bis: number;
  mitte: number;
}

export function ostAnteil(eintrag: Eintrag): number | null {
  if (eintrag.status === "forecast") {
    return eintrag.p_east;
  }
  if (eintrag.status === "gap") {
    return null;
  }
  if (eintrag.east_share !== null) {
    return eintrag.east_share;
  }
  return eintrag.runway_direction === null ? null : eintrag.runway_direction === "east" ? 1 : 0;
}

export function saeulen(eintraege: Eintrag[], ab: string, bis: string): Saeule[] {
  return eintraege
    .filter((e) => e.local_date >= ab && e.local_date <= bis)
    .flatMap((e) => {
      const ost = ostAnteil(e);
      return ost === null ? [] : [{ von: Date.parse(e.start), bis: Date.parse(e.end), ost, eintrag: e }];
    })
    .sort((a, b) => a.von - b.von);
}

export function addTage(datum: string, tage: number): string {
  return new Date(Date.parse(`${datum}T12:00:00Z`) + tage * 86400000).toISOString().slice(0, 10);
}

// Ein Betriebstag läuft wie die Fenster von 6 Uhr bis 6 Uhr des Folgetags (Lokalzeit).
export function tagesraster(ab: string, anzahl: number): Tag[] {
  return Array.from({ length: anzahl }, (_, i) => {
    const datum = addTage(ab, i);
    const von = lokaleZeit(datum, 6);
    const bis = lokaleZeit(addTage(datum, 1), 6);
    return { datum, von, bis, mitte: (von + bis) / 2 };
  });
}
