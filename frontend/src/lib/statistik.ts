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
  laengsteOstphaseStunden: number;
  laengsteWestphaseStunden: number;
  profil: Record<Eintrag["slot"], Profil | null>;
  von: string | null;
  bis: string | null;
  geschaetztAnteil: number | null;
}

// Eine volle Stunde aus der Stundenreihe der API: Beginn (ms seit Epoche) und Richtung (1 Ost, 0 West).
export interface Stunde {
  start: number;
  east: number;
}

interface Wahrheit {
  start: number;
  ende: number;
  datum: string;
  slot: Eintrag["slot"];
  ost: number;
  geschaetzt: boolean;
}

const STUNDE = 3600000;
const tagFormat = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Europe/Berlin" });

// Ostanteil der Wahrheit eines Fensters (beobachtet oder aus Messwind geschätzt), null für Prognose, laufendes Fenster und Lücke.
export function wahrheitsAnteil(e: Eintrag): number | null {
  if (e.status === "forecast" || e.status === "running" || e.status === "gap") {
    return null;
  }
  return e.east_share ?? (e.runway_direction === null ? null : e.runway_direction === "east" ? 1 : 0);
}

function wahrheiten(eintraege: Eintrag[]): Wahrheit[] {
  return eintraege
    .flatMap((e): Wahrheit[] => {
      const ost = wahrheitsAnteil(e);
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

// Lokales Datum (Europe/Berlin) einer Stunde im Format JJJJ-MM-TT.
export function tagVon(zeit: number): string {
  const teile = tagFormat.formatToParts(new Date(zeit));
  const wert = (typ: string) => teile.find((t) => t.type === typ)?.value ?? "";
  return `${wert("year")}-${wert("month")}-${wert("day")}`;
}

// Tage zählen nach der Mehrheit ihrer Stunden: mehr als die Hälfte Ost ist Ost. Der Anteil eines Tags ist das Stunden-Mittel.
export function tageNachStunden(stunden: Stunde[]): Tagesanteil[] {
  const nachTag = new Map<string, { ost: number; stunden: number }>();
  for (const h of stunden) {
    const datum = tagVon(h.start);
    const t = nachTag.get(datum) ?? { ost: 0, stunden: 0 };
    t.ost += h.east;
    t.stunden += 1;
    nachTag.set(datum, t);
  }
  return [...nachTag]
    .map(([datum, t]) => ({ datum, ost: t.ost / t.stunden, fenster: t.stunden }))
    .sort((a, b) => a.datum.localeCompare(b.datum));
}

// Längste lückenlose Folge gleicher Stunden (Ost oder West), in Stunden. Eine Lücke in der Stundenreihe bricht sie.
export function laengstePhase(stunden: Stunde[], wert: 0 | 1): number {
  let phase = 0;
  let laengste = 0;
  let vorher: number | null = null;
  for (const h of stunden) {
    const anschluss = vorher !== null && h.start - vorher === STUNDE;
    phase = h.east === wert ? (anschluss ? phase : 0) + 1 : 0;
    laengste = Math.max(laengste, phase);
    vorher = h.start;
  }
  return laengste;
}

export function statistik(eintraege: Eintrag[], stunden: Stunde[] = []): Statistik {
  const liste = wahrheiten(eintraege);
  const tage = tageNachStunden(stunden);

  const profil = (slot: Eintrag["slot"]): Profil | null => {
    const ws = liste.filter((w) => w.slot === slot);
    return ws.length === 0 ? null : { ost: gewichtet(ws), fenster: ws.length };
  };

  return {
    tage,
    fenster: liste.length,
    ostanteil: stunden.length > 0 ? stunden.reduce((s, h) => s + h.east, 0) / stunden.length : liste.length === 0 ? null : gewichtet(liste),
    tageMitOst: tage.filter((t) => t.ost > 0.5).length,
    laengsteOstphaseStunden: laengstePhase(stunden, 1),
    laengsteWestphaseStunden: laengstePhase(stunden, 0),
    profil: { morning: profil("morning"), afternoon: profil("afternoon"), night: profil("night") },
    von: tage[0]?.datum ?? null,
    bis: tage[tage.length - 1]?.datum ?? null,
    geschaetztAnteil: liste.length === 0 ? null : liste.filter((w) => w.geschaetzt).length / liste.length,
  };
}
