import { describe, expect, it } from "vitest";
import { methodik } from "./methodik";

describe("methodik", () => {
  const alleTexte = methodik.flatMap((abschnitt) => [
    abschnitt.titel,
    ...abschnitt.absaetze,
    ...(abschnitt.liste ?? []),
  ]);

  it("hat die geplanten Abschnitte", () => {
    expect(methodik.map((abschnitt) => abschnitt.titel)).toContain("Wie die Prognose entsteht");
    expect(methodik.length).toBeGreaterThanOrEqual(6);
  });

  it("verwendet keine Gedankenstriche", () => {
    for (const text of alleTexte) {
      expect(text).not.toMatch(/[—–]/);
    }
  });
});
