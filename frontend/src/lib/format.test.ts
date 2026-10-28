import { describe, expect, it } from "vitest";
import { formatDatum, formatDauer, formatDauerKurz, formatUhrzeit, ganzProzent, lokalesDatum } from "./format";

describe("Zeitformate", () => {
  it("formatiert ein lokales Datum auf Deutsch", () => {
    expect(formatDatum("2026-10-18")).toContain("18.10.");
  });

  it("zeigt Uhrzeiten in Berliner Zeit", () => {
    expect(formatUhrzeit("2026-10-16T05:40:00.000Z")).toBe("07:40");
  });

  it("bestimmt den lokalen Kalendertag auch nach Mitternacht in Berlin", () => {
    expect(lokalesDatum(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(lokalesDatum(new Date("2026-10-24T20:30:00Z"))).toBe("2026-10-24");
  });
});

describe("Zahlenformate", () => {
  it("formatiert Dauern mit richtiger Einzahl und Mehrzahl", () => {
    expect(formatDauer(8)).toBe("8\u00a0Std.");
    expect(formatDauer(24)).toBe("1\u00a0Tag");
    expect(formatDauer(50)).toBe("2\u00a0Tage 2\u00a0Std.");
  });

  it("rundet Prozentwerte auf ganze Zahlen mit geschütztem Leerzeichen", () => {
    expect(ganzProzent(0.504)).toBe("50\u00a0%");
  });

  it("kürzt Dauern für schmale Karten: bis 72 Stunden in Stunden, darüber in Tagen mit einer Nachkommastelle", () => {
    expect(formatDauerKurz(40)).toBe("40\u00a0Std.");
    expect(formatDauerKurz(96)).toBe("4\u00a0Tage");
    expect(formatDauerKurz(108)).toBe("4,5\u00a0Tage");
  });
});

