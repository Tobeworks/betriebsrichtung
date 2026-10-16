import { describe, expect, it } from "vitest";
import { einordnen, prozentText } from "./probability";

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
    [0.19, "eher West", "west"],
    [0.2, "tendenziell West", "west"],
    [0.4, "offen", "offen"],
    [0.6, "tendenziell Ost", "ost"],
    [0.8, "eher Ost", "ost"],
  ])("ordnet %s als %s ein", (wert, klasse, richtung) => {
    const ergebnis = einordnen(wert);
    expect(ergebnis.klasse).toBe(klasse);
    expect(ergebnis.richtung).toBe(richtung);
  });
});
