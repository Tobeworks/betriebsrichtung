import { describe, expect, it } from "vitest";
import { datenschutz, impressum } from "./rechtliches";

const alleTexte = [...impressum, ...datenschutz].flatMap((abschnitt) => [abschnitt.titel, ...abschnitt.absaetze]);

describe("rechtliche Seiten", () => {
  it("nennen Betreiber und Kontakt aus dem Impressum", () => {
    const text = impressum.flatMap((abschnitt) => abschnitt.absaetze).join(" ");
    expect(text).toContain("Tobias Lorsbach");
    expect(text).toContain("hallo@tobeworks.de");
  });

  it("nennen im Impressum und in der Datenschutzerklärung dieselbe aktuelle Anschrift", () => {
    const anbieter = impressum.find((abschnitt) => abschnitt.titel === "Anbieter")?.absaetze.join(" ");
    expect(anbieter).toContain("Dammstraße 59");
    expect(anbieter).toContain("65462 Ginsheim-Gustavsburg");
    expect(datenschutz.flatMap((abschnitt) => abschnitt.absaetze).join(" ")).toContain("Dammstraße 59, 65462 Ginsheim-Gustavsburg");
    expect(alleTexte.join(" ")).not.toMatch(/Universitätsstraße|55116|Mainz/);
  });

  it("verlinken die Homepage", () => {
    const links = impressum.flatMap((abschnitt) => abschnitt.links ?? []);
    expect(links).toContainEqual({ text: "Homepage: tobeworks.de", url: "https://tobeworks.de" });
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
