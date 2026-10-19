import { lokaleZeit } from "./format";
import type { Eintrag } from "./zeitachse";

export interface Segment {
  von: number;
  bis: number;
  ost: number;
  blass: boolean;
}

export interface Saeule {
  von: number;
  bis: number;
  ost: number;
  eintrag: Eintrag;
  segmente: Segment[];
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
  if (eintrag.status === "running") {
    return eintrag.east_share;
  }
  if (eintrag.status === "gap") {
    return null;
  }
  if (eintrag.east_share !== null) {
    return eintrag.east_share;
  }
  return eintrag.runway_direction === null ? null : eintrag.runway_direction === "east" ? 1 : 0;
}

// Eine Säule besteht meist aus einem Segment. Das laufende Fenster teilt sich am bekannten Teil: links kräftig aus Messwind,
// rechts blass aus der Prognose (oder aus dem Stand des bekannten Teils, wenn es keine Prognose gibt).
function segmente(eintrag: Eintrag, von: number, bis: number, ost: number): Segment[] {
  if (eintrag.status === "forecast") {
    return [{ von, bis, ost, blass: true }];
  }
  if (eintrag.status !== "running") {
    return [{ von, bis, ost, blass: false }];
  }
  const grenze = von + (bis - von) * eintrag.actual_share;
  const teile: Segment[] = [];
  if (eintrag.east_actual !== null && eintrag.actual_share > 0) {
    teile.push({ von, bis: grenze, ost: eintrag.east_actual, blass: false });
  }
  if (grenze < bis) {
    teile.push({ von: grenze, bis, ost: eintrag.p_east_rest ?? eintrag.east_actual ?? ost, blass: true });
  }
  return teile;
}

export function saeulen(eintraege: Eintrag[], ab: string, bis: string): Saeule[] {
  return eintraege
    .filter((e) => e.local_date >= ab && e.local_date <= bis)
    .flatMap((e) => {
      const ost = ostAnteil(e);
      if (ost === null) {
        return [];
      }
      const von = Date.parse(e.start);
      const bis = Date.parse(e.end);
      return [{ von, bis, ost, eintrag: e, segmente: segmente(e, von, bis, ost) }];
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
