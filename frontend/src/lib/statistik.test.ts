import { describe, expect, it } from "vitest";
import { statistik } from "./statistik";
import type { Eintrag } from "./zeitachse";

function fenster(datum: string, slot: Eintrag["slot"], start: string, ende: string, ost: number | null, status: "estimated" | "observed" | "gap" = "estimated"): Eintrag {
  return {
    status, local_date: datum, slot, start: `${start}:00.000Z`, end: `${ende}:00.000Z`,
    runway_direction: ost === null ? null : ost > 0.5 ? "east" : "west", east_share: ost, source: null,
  };
}

const tag1 = [
  fenster("2026-10-16", "morning", "2026-10-16T04:00", "2026-10-16T12:00", 0),
  fenster("2026-10-16", "afternoon", "2026-10-16T12:00", "2026-10-16T20:00", 1),
  fenster("2026-10-16", "night", "2026-10-16T20:00", "2026-10-17T04:00", 1),
];
const tag2 = [
  fenster("2026-10-17", "morning", "2026-10-17T04:00", "2026-10-17T12:00", 1),
  fenster("2026-10-17", "afternoon", "2026-10-17T12:00", "2026-10-17T20:00", 0),
];

describe("statistik", () => {
  it("rechnet Ostanteil, Tage mit Ost und Profil aus den Fenstern mit Wahrheit", () => {
    const s = statistik([...tag1, ...tag2]);
    expect(s.fenster).toBe(5);
    expect(s.ostanteil).toBeCloseTo(3 / 5);
    expect(s.tage.map((t) => [t.datum, Math.round(t.ost * 100)])).toEqual([["2026-10-16", 67], ["2026-10-17", 50]]);
    expect(s.tageMitOst).toBe(1);
    expect(s.profil.morning).toEqual({ ost: 0.5, fenster: 2 });
    expect(s.profil.night).toEqual({ ost: 1, fenster: 1 });
    expect([s.von, s.bis]).toEqual(["2026-10-16", "2026-10-17"]);
    expect(s.geschaetztAnteil).toBe(1);
  });

  it("findet die längste zusammenhängende Ostphase in Stunden", () => {
    // Nachmittag, Nacht und Vormittag am Stück: 8 + 8 + 8 Stunden
    const s = statistik([...tag1, ...tag2]);
    expect(s.laengsteOstphaseStunden).toBe(24);
    // Westfenster sind der Vormittag am 16. und der Nachmittag am 17., dazwischen liegt Ost: zwei getrennte Phasen
    expect(s.laengsteWestphaseStunden).toBe(8);
  });

  it("ignoriert Lücken und Prognosen und liefert ohne Daten leere Werte", () => {
    const prognose: Eintrag = {
      status: "forecast", local_date: "2026-10-18", slot: "morning", start: "2026-10-18T04:00:00Z", end: "2026-10-18T12:00:00Z",
      p_east: 1, p_east_raw: 1, lead_hours: 1, computed_at: "2026-10-18T00:00:00Z", members: 1, calibrated: false,
    };
    const luecke = fenster("2026-10-18", "afternoon", "2026-10-18T12:00", "2026-10-18T20:00", null, "gap");
    const laufend: Eintrag = {
      status: "running", local_date: "2026-10-18", slot: "night", start: "2026-10-18T20:00:00.000Z", end: "2026-10-19T04:00:00.000Z",
      east_share: 1, actual_share: 0.5, east_actual: 1, p_east_rest: 1, known_until: "2026-10-19T00:00:00.000Z", latest_direction: "east",
    };
    const s = statistik([prognose, luecke, laufend]);
    expect(s.fenster).toBe(0);
    expect(s.ostanteil).toBeNull();
    expect(s.tage).toEqual([]);
    expect(s.profil.morning).toBeNull();
  });

  it("findet die längste Westphase über mehrere zusammenhängende Fenster und bricht sie an einer Lücke ab", () => {
    const west = [
      fenster("2026-10-14", "morning", "2026-10-14T04:00", "2026-10-14T12:00", 0),
      fenster("2026-10-14", "afternoon", "2026-10-14T12:00", "2026-10-14T20:00", 0.25),
      fenster("2026-10-14", "night", "2026-10-14T20:00", "2026-10-15T04:00", 0),
      // Lücke: das Fenster am 15. vormittags fehlt
      fenster("2026-10-15", "afternoon", "2026-10-15T12:00", "2026-10-15T20:00", 0),
    ];
    const s = statistik(west);
    expect(s.laengsteWestphaseStunden).toBe(24);
    expect(s.laengsteOstphaseStunden).toBe(0);
  });

  it("zählt ein Fenster mit genau 50 Prozent weder als Ost noch als West", () => {
    const s = statistik([fenster("2026-10-14", "morning", "2026-10-14T04:00", "2026-10-14T12:00", 0.5)]);
    expect([s.laengsteOstphaseStunden, s.laengsteWestphaseStunden]).toEqual([0, 0]);
  });
});

