import type { Eintrag } from "./zeitachse";

export interface Tagesanteil {
  datum: string;
  ost: number;
  fenster: number;
}

export interface Profil {
  ost: number;
  fenster: number;
}

export interface Statistik {
  tage: Tagesanteil[];
  fenster: number;
  ostanteil: number | null;
  tageMitOst: number;
  laengstePhaseStunden: number;
  profil: Record<Eintrag["slot"], Profil | null>;
  von: string | null;
  bis: string | null;
  geschaetztAnteil: number | null;
}

interface Wahrheit {
  start: number;
  ende: number;
  datum: string;
  slot: Eintrag["slot"];
  ost: number;
  geschaetzt: boolean;
}

function wahrheiten(eintraege: Eintrag[]): Wahrheit[] {
  return eintraege
    .flatMap((e): Wahrheit[] => {
      if (e.status === "forecast" || e.status === "gap") {
        return [];
      }
      const ost = e.east_share ?? (e.runway_direction === null ? null : e.runway_direction === "east" ? 1 : 0);
      return ost === null
        ? []
        : [{ start: Date.parse(e.start), ende: Date.parse(e.end), datum: e.local_date, slot: e.slot, ost, geschaetzt: e.status === "estimated" }];
    })
    .sort((a, b) => a.start - b.start);
}

// Mittelwert nach Dauer der Fenster, damit das kürzere Nachtfenster am Zeitumstellungstag nicht überzählt.
function gewichtet(liste: Wahrheit[]): number {
  const dauer = liste.reduce((summe, w) => summe + (w.ende - w.start), 0);
  return liste.reduce((summe, w) => summe + w.ost * (w.ende - w.start), 0) / dauer;
}

export function statistik(eintraege: Eintrag[]): Statistik {
  const liste = wahrheiten(eintraege);
  const nachTag = new Map<string, Wahrheit[]>();
  for (const w of liste) {
    nachTag.set(w.datum, [...(nachTag.get(w.datum) ?? []), w]);
  }
  const tage = [...nachTag]
    .map(([datum, ws]) => ({ datum, ost: gewichtet(ws), fenster: ws.length }))
    .sort((a, b) => a.datum.localeCompare(b.datum));

  let phase = 0;
  let laengste = 0;
  let vorher: Wahrheit | null = null;
  for (const w of liste) {
    const anschluss = vorher !== null && Math.abs(w.start - vorher.ende) < 60000;
    phase = w.ost > 0.5 ? (anschluss && phase > 0 ? phase : 0) + (w.ende - w.start) : 0;
    laengste = Math.max(laengste, phase);
    vorher = w;
  }

  const profil = (slot: Eintrag["slot"]): Profil | null => {
    const ws = liste.filter((w) => w.slot === slot);
    return ws.length === 0 ? null : { ost: gewichtet(ws), fenster: ws.length };
  };

  return {
    tage,
    fenster: liste.length,
    ostanteil: liste.length === 0 ? null : gewichtet(liste),
    tageMitOst: tage.filter((t) => t.ost > 0.5).length,
    laengstePhaseStunden: Math.round(laengste / 3600000),
    profil: { morning: profil("morning"), afternoon: profil("afternoon"), night: profil("night") },
    von: tage[0]?.datum ?? null,
    bis: tage[tage.length - 1]?.datum ?? null,
    geschaetztAnteil: liste.length === 0 ? null : liste.filter((w) => w.geschaetzt).length / liste.length,
  };
}
