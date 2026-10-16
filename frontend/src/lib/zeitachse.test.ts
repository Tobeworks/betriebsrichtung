import { describe, expect, it } from "vitest";
import type { Eintrag } from "./zeitachse";
import { beispielZeitachse } from "../api/fixtures";
import { beschreibeEintrag, slotName } from "./zeitachse";

const [beobachtet, prognose] = beispielZeitachse.items;

describe("beschreibeEintrag", () => {
  it("beschreibt eine Beobachtung mit Richtung in Worten", () => {
    expect(beschreibeEintrag(beobachtet)).toEqual({ zustand: "west", text: "West, beobachtet" });
  });

  it("beschreibt eine Prognose mit Einordnung und Prozentwert", () => {
    expect(beschreibeEintrag(prognose)).toEqual({
      zustand: "ost",
      text: "tendenziell Ost, Ostbetrieb 60 %",
    });
  });

  it("markiert Lücken als keine Daten", () => {
    const luecke = {
      status: "gap",
      local_date: "2026-10-15",
      slot: "afternoon",
      start: "2026-10-15T12:00:00.000Z",
      end: "2026-10-15T20:00:00.000Z",
      runway_direction: null,
      east_share: null,
      source: null,
    } satisfies Eintrag;
    expect(beschreibeEintrag(luecke)).toEqual({ zustand: "luecke", text: "keine Daten" });
  });

  it("kennzeichnet geschätzte Historie als geschätzt", () => {
    const geschaetzt = {
      status: "estimated",
      local_date: "2026-10-15",
      slot: "afternoon",
      start: "2026-10-15T12:00:00.000Z",
      end: "2026-10-15T20:00:00.000Z",
      runway_direction: "east",
      east_share: 0.5,
      source: "wind_estimate",
    } satisfies Eintrag;
    expect(beschreibeEintrag(geschaetzt)).toEqual({ zustand: "ost", text: "Ost, geschätzt" });
  });
});

describe("slotName", () => {
  it("übersetzt die drei Zeitfenster", () => {
    expect(slotName("morning")).toBe("Vormittag");
    expect(slotName("afternoon")).toBe("Nachmittag");
    expect(slotName("night")).toBe("Nacht");
  });
});
