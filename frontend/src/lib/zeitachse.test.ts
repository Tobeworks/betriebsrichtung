import { describe, expect, it } from "vitest";
import type { Eintrag } from "./zeitachse";
import { beispielZeitachse } from "../api/fixtures";
import { beschreibeEintrag, nachTagen, slotName } from "./zeitachse";

const [beobachtet, prognose] = beispielZeitachse.items;

describe("beschreibeEintrag", () => {
  it("beschreibt eine Beobachtung mit Richtung in Worten", () => {
    expect(beschreibeEintrag(beobachtet)).toMatchObject({ zustand: "west", text: "West, beobachtet" });
  });

  it("beschreibt eine Prognose mit Einordnung und Prozentwert", () => {
    expect(beschreibeEintrag(prognose)).toMatchObject({
      haupt: "60\u00a0%",
      neben: "Prognose: tendenziell Ost",
      prognose: true,
      zustand: "ost",
      text: "tendenziell Ost, Ostbetrieb 60 %",
      ostAnteil: 0.62,
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
    expect(beschreibeEintrag(luecke)).toMatchObject({ zustand: "luecke", text: "keine Daten" });
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
    expect(beschreibeEintrag(geschaetzt)).toMatchObject({
      zustand: "offen",
      haupt: "50\u00a0%",
      neben: "geschätzt: offen",
      ostAnteil: 0.5,
    });
    expect(beschreibeEintrag({ ...geschaetzt, east_share: null })).toMatchObject({ zustand: "ost", text: "Ost, geschätzt" });
  });
});

describe("slotName", () => {
  it("übersetzt die drei Zeitfenster", () => {
    expect(slotName("morning")).toBe("Vormittag");
    expect(slotName("afternoon")).toBe("Nachmittag");
    expect(slotName("night")).toBe("Nacht");
  });
});

describe("nachTagen", () => {
  it("gruppiert die Fenster nach Tag und sortiert die Tage", () => {
    const spaeter = { ...prognose, local_date: "2026-10-19", slot: "night" as const };
    const tage = nachTagen([spaeter, beobachtet, prognose]);
    expect(tage.map((t) => t.datum)).toEqual(["2026-10-15", "2026-10-18", "2026-10-19"]);
    expect(Object.keys(tage[1].slots)).toEqual([prognose.slot]);
    expect(tage[2].slots.night).toBe(spaeter);
  });
});
