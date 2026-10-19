import { describe, expect, it } from "vitest";
import { addTage, ostAnteil, saeulen, tagesraster } from "./diagramm";
import type { Eintrag } from "./zeitachse";

const basis = { slot: "morning" as const, start: "2026-10-18T04:00:00.000Z", end: "2026-10-18T12:00:00.000Z" };
const prognose = { ...basis, status: "forecast" as const, local_date: "2026-10-18", p_east: 0.3, p_east_raw: 0.3,
  lead_hours: 1, computed_at: "2026-10-18T00:00:00.000Z", members: 10, calibrated: false };
const beobachtet = { ...basis, start: "2026-10-17T04:00:00.000Z", end: "2026-10-17T12:00:00.000Z",
  status: "observed" as const, local_date: "2026-10-17", runway_direction: "east" as const,
  east_share: null, source: "umwelthaus" as const };
const luecke = { ...beobachtet, status: "gap" as const, runway_direction: null };

describe("saeulen mit laufendem Fenster", () => {
  const laufend = {
    status: "running", local_date: "2026-10-18", slot: "morning", start: "2026-10-18T04:00:00.000Z",
    end: "2026-10-18T12:00:00.000Z", east_share: 0.7, actual_share: 0.25, east_actual: 1, p_east_rest: 0.6,
    known_until: "2026-10-18T06:00:00.000Z", latest_direction: "east",
  } satisfies Eintrag;

  it("teilt die Säule am bekannten Teil in kräftig (Messwind) und blass (Prognose)", () => {
    const [s] = saeulen([laufend], "2026-10-18", "2026-10-18");
    expect(s.segmente.map((t) => [t.ost, t.blass])).toEqual([[1, false], [0.6, true]]);
    expect(s.segmente[0].bis).toBe(Date.parse("2026-10-18T06:00:00.000Z"));
    expect(s.segmente[1].von).toBe(Date.parse("2026-10-18T06:00:00.000Z"));
  });

  it("zeigt ohne bekannten Teil nur das blasse Segment", () => {
    const [s] = saeulen([{ ...laufend, actual_share: 0, east_actual: null }], "2026-10-18", "2026-10-18");
    expect(s.segmente.map((t) => t.blass)).toEqual([true]);
  });
});

describe("diagramm", () => {
  it("leitet den Ostanteil aus Prognose, Beobachtung und Lücke ab", () => {
    expect(ostAnteil(prognose)).toBe(0.3);
    expect(ostAnteil(beobachtet)).toBe(1);
    expect(ostAnteil({ ...beobachtet, east_share: 0.25 })).toBe(0.25);
    expect(ostAnteil(luecke)).toBeNull();
  });

  it("nimmt nur Tage im Bereich, ohne Lücken, nach Zeit sortiert", () => {
    const alle: Eintrag[] = [prognose, beobachtet, luecke, { ...prognose, local_date: "2026-10-30" }];
    expect(saeulen(alle, "2026-10-17", "2026-10-18").map((s) => s.ost)).toEqual([1, 0.3]);
  });

  it("legt Betriebstage von 6 bis 6 Uhr Lokalzeit fest, auch über die Zeitumstellung", () => {
    const [heute, morgen] = tagesraster("2026-10-17", 2);
    expect(heute.von).toBe(Date.parse("2026-10-17T04:00:00.000Z"));
    expect(heute.bis).toBe(morgen.von);
    const [vorUmstellung] = tagesraster("2026-10-24", 1);
    expect(vorUmstellung.bis - vorUmstellung.von).toBe(25 * 3600000);
    expect(addTage("2026-10-31", 1)).toBe("2026-11-01");
  });
});
