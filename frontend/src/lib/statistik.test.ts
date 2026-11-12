import { describe, expect, it } from "vitest";
import { laengstePhase, statistik, tageNachStunden, tagVon, wahrheitsAnteil, type Stunde } from "./statistik";
import type { Eintrag } from "./zeitachse";

const STUNDE = 3600000;

function fenster(datum: string, slot: Eintrag["slot"], start: string, ende: string, ost: number | null, status: "estimated" | "observed" | "gap" = "estimated"): Eintrag {
  return {
    status, local_date: datum, slot, start: `${start}:00.000Z`, end: `${ende}:00.000Z`,
    runway_direction: ost === null ? null : ost > 0.5 ? "east" : "west", east_share: ost, source: null,
  } as Eintrag;
}

// Stundenreihe ab einem Zeitpunkt (UTC) mit einer festen Richtung je Stunde
function stunden(start: string, werte: number[]): Stunde[] {
  const basis = Date.parse(`${start}:00.000Z`);
  return werte.map((east, i) => ({ start: basis + i * STUNDE, east }));
}

describe("tagVon", () => {
  it("ordnet Stunden dem lokalen Berliner Tag zu, auch kurz vor Mitternacht", () => {
    expect(tagVon(Date.parse("2026-10-16T21:30:00Z"))).toBe("2026-10-16");
    expect(tagVon(Date.parse("2026-10-16T22:30:00Z"))).toBe("2026-10-17");
  });
});

describe("tageNachStunden", () => {
  it("zählt einen Tag mit 5 von 8 Ost-Stunden als Ost, einen mit 4 von 8 als West", () => {
    const tage = tageNachStunden([
      ...stunden("2026-10-16T04:00", [1, 1, 1, 1, 1, 0, 0, 0]),
      ...stunden("2026-10-16T12:00", [1, 1, 1, 1, 0, 0, 0, 0]),
    ]);
    expect(tage).toHaveLength(1);
    expect(tage[0].datum).toBe("2026-10-16");
    expect(tage[0].ost).toBeCloseTo(9 / 16);
    expect(tage[0].fenster).toBe(16);
  });

  it("zählt einen fast reinen Ost-Tag als Ost, auch wenn zwei Stunden West sind", () => {
    const tage = tageNachStunden(stunden("2026-10-17T04:00", [1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]));
    expect(tage[0].ost).toBeGreaterThan(0.5);
  });
});

describe("laengstePhase", () => {
  it("zählt lückenlose gleiche Stunden und bricht bei der anderen Richtung ab", () => {
    expect(laengstePhase(stunden("2026-10-16T04:00", [1, 1, 1, 0, 1, 1]), 1)).toBe(3);
    expect(laengstePhase(stunden("2026-10-16T04:00", [1, 1, 1, 0, 1, 1]), 0)).toBe(1);
  });

  it("bricht die Phase bei einer Lücke in der Stundenreihe", () => {
    const luecke = [
      { start: Date.parse("2026-10-16T04:00:00Z"), east: 1 },
      { start: Date.parse("2026-10-16T05:00:00Z"), east: 1 },
      { start: Date.parse("2026-10-16T08:00:00Z"), east: 1 },
    ];
    expect(laengstePhase(luecke, 1)).toBe(2);
  });

  it("liefert ohne Stunden null", () => {
    expect(laengstePhase([], 1)).toBe(0);
  });
});

describe("statistik mit Stunden", () => {
  it("nimmt den Ostanteil und die Tage aus den Stunden, nicht aus den Fenstern", () => {
    const reihe = [...stunden("2026-10-16T04:00", [1, 1, 1, 1, 0, 0, 0, 0]), ...stunden("2026-10-17T04:00", [0, 0, 0, 0, 0, 0, 0, 0])];
    const s = statistik([], reihe);
    expect(s.ostanteil).toBeCloseTo(4 / 16);
    expect(s.tage.map((t) => t.datum)).toEqual(["2026-10-16", "2026-10-17"]);
    expect(s.tageMitOst).toBe(0);
    expect(s.laengsteOstphaseStunden).toBe(4);
    expect(s.laengsteWestphaseStunden).toBe(8);
  });

  it("zeigt Profil und Abdeckung weiter aus den Fenstern mit Wahrheit", () => {
    const eintraege = [
      fenster("2026-10-17", "morning", "2026-10-17T04:00", "2026-10-17T12:00", 1),
      fenster("2026-10-17", "afternoon", "2026-10-17T12:00", "2026-10-17T20:00", 0),
    ];
    const s = statistik(eintraege, stunden("2026-10-17T04:00", [1, 1, 1, 1, 1, 1, 1, 1]));
    expect(s.profil.morning).toEqual({ ost: 1, fenster: 1 });
    expect(s.profil.afternoon).toEqual({ ost: 0, fenster: 1 });
    expect(s.geschaetztAnteil).toBe(1);
  });

  it("liefert ohne Daten leere Werte", () => {
    const s = statistik([], []);
    expect(s.ostanteil).toBeNull();
    expect(s.tage).toEqual([]);
    expect(s.laengsteOstphaseStunden).toBe(0);
  });
});

describe("wahrheitsAnteil", () => {
  it("ist null für Prognose, laufendes Fenster und Lücke", () => {
    expect(wahrheitsAnteil(fenster("2026-10-16", "morning", "2026-10-16T04:00", "2026-10-16T12:00", null, "gap"))).toBeNull();
  });
});
