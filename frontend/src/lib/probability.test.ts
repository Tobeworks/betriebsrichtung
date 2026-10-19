import { describe, expect, it } from "vitest";
import { einordnen, prozentText, teilung } from "./probability";

describe("prozentText", () => {
  it("rundet auf 5 Prozentpunkte und nutzt geschützte Leerzeichen", () => {
    expect(prozentText(0.62)).toBe("60 %");
    expect(prozentText(0.5)).toBe("50 %");
  });

  it("zeigt Randwerte als unter 5 und über 95 Prozent", () => {
    expect(prozentText(0.01)).toBe("unter 5 %");
    expect(prozentText(0.98)).toBe("über 95 %");
  });
});

describe("einordnen", () => {
  it.each([
    [0.24, "West", "west"],
    [0.25, "tendenziell West", "west"],
    [0.4, "offen", "offen"],
    [0.6, "tendenziell Ost", "ost"],
    [0.74, "tendenziell Ost", "ost"],
    [0.75, "Ost", "ost"],
  ])("ordnet %s als %s ein", (wert, klasse, richtung) => {
    const ergebnis = einordnen(wert);
    expect(ergebnis.klasse).toBe(klasse);
    expect(ergebnis.richtung).toBe(richtung);
  });
});

describe("teilung", () => {
  it("teilt in Ost und West auf 5 Prozentpunkte gerundet, zusammen immer 100", () => {
    expect(teilung(0.4)).toEqual({ ost: "40\u00a0%", west: "60\u00a0%", dominant: "west" });
    expect(teilung(0.62)).toEqual({ ost: "60\u00a0%", west: "40\u00a0%", dominant: "ost" });
    expect(teilung(0.225)).toEqual({ ost: "25\u00a0%", west: "75\u00a0%", dominant: "west" });
  });

  it("nennt keine dominante Richtung bei 50 zu 50 und zeigt Randwerte als unter 5 und über 95", () => {
    expect(teilung(0.5).dominant).toBeNull();
    expect(teilung(0.02)).toEqual({ ost: "<5\u00a0%", west: ">95\u00a0%", dominant: "west" });
    expect(teilung(0.98)).toEqual({ ost: ">95\u00a0%", west: "<5\u00a0%", dominant: "ost" });
  });
});

