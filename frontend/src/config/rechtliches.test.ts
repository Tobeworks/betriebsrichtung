import { describe, expect, it } from "vitest";
import { datenschutz, impressum } from "./rechtliches";

const alleTexte = [...impressum, ...datenschutz].flatMap((abschnitt) => [abschnitt.titel, ...abschnitt.absaetze]);

describe("rechtliche Seiten", () => {
  it("nennen Betreiber und Kontakt aus dem Impressum", () => {
    const text = impressum.flatMap((abschnitt) => abschnitt.absaetze).join(" ");
    expect(text).toContain("Tobias Lorsbach");
    expect(text).toContain("hallo@tobeworks.de");
  });

  it("beschreiben die Datenschutzerklärung ohne Dienste, die die App nicht nutzt", () => {
    const text = alleTexte.join(" ");
    expect(text).not.toMatch(/Matomo|Cal\.com|Google Analytics/);
    expect(text).toContain("keine Cookies");
  });

  it("verwenden keine Gedankenstriche", () => {
    for (const text of alleTexte) {
      expect(text).not.toMatch(/[—–]/);
    }
  });
});
