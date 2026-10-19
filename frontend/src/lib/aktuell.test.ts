import { describe, expect, it } from "vitest";
import { aktuelleRichtung } from "./aktuell";
import type { Eintrag } from "./zeitachse";

const JETZT = Date.parse("2026-10-18T10:00:00Z");

function wahrheit(start: string, ende: string, richtung: "east" | "west" | null, status: "estimated" | "observed" | "gap" = "estimated"): Eintrag {
  return { status, local_date: "2026-10-18", slot: "morning", start, end: ende, runway_direction: richtung, east_share: null, source: null };
}

describe("aktuelleRichtung", () => {
  it("nimmt das laufende Fenster mit seiner Herkunft", () => {
    const e = [wahrheit("2026-10-18T04:00:00Z", "2026-10-18T12:00:00Z", "east")];
    expect(aktuelleRichtung(e, JETZT)).toEqual({ richtung: "ost", herkunft: "geschaetzt" });
    expect(aktuelleRichtung([wahrheit(e[0].start, e[0].end, "west", "observed")], JETZT)).toEqual({ richtung: "west", herkunft: "beobachtet" });
  });

  it("fällt auf die zuletzt begonnene Wahrheit zurück, wenn das laufende Fenster eine Lücke ist", () => {
    const e = [
      wahrheit("2026-10-17T20:00:00Z", "2026-10-18T04:00:00Z", "west"),
      wahrheit("2026-10-18T04:00:00Z", "2026-10-18T12:00:00Z", null, "gap"),
    ];
    expect(aktuelleRichtung(e, JETZT)).toEqual({ richtung: "west", herkunft: "geschaetzt" });
  });

  it("liefert nichts ohne Daten und ignoriert künftige Fenster", () => {
    expect(aktuelleRichtung([], JETZT)).toEqual({ richtung: null, herkunft: null });
    expect(aktuelleRichtung([wahrheit("2026-10-18T12:00:00Z", "2026-10-18T20:00:00Z", "east")], JETZT).richtung).toBeNull();
  });

  it("nutzt eine Prognose nur für das laufende Fenster", () => {
    const prognose: Eintrag = {
      status: "forecast", local_date: "2026-10-18", slot: "morning", start: "2026-10-18T04:00:00Z",
      end: "2026-10-18T12:00:00Z", p_east: 0.7, p_east_raw: 0.7, lead_hours: 0, computed_at: "2026-10-18T03:00:00Z",
      members: 10, calibrated: false,
    };
    expect(aktuelleRichtung([prognose], JETZT)).toEqual({ richtung: "ost", herkunft: "prognose" });
  });

  it("nimmt bei einem laufenden Fenster die letzte geschätzte Richtung statt der Mischung", () => {
    const laufend: Eintrag = {
      status: "running", local_date: "2026-10-18", slot: "morning", start: "2026-10-18T04:00:00Z", end: "2026-10-18T12:00:00Z",
      east_share: 0.4, actual_share: 0.25, east_actual: 0, p_east_rest: 0.5, known_until: "2026-10-18T06:00:00Z",
      latest_direction: "west",
    };
    expect(aktuelleRichtung([laufend], JETZT)).toEqual({ richtung: "west", herkunft: "geschaetzt" });
    expect(aktuelleRichtung([{ ...laufend, latest_direction: null, east_share: 0.7 }], JETZT)).toEqual({ richtung: "ost", herkunft: "prognose" });
  });
});
