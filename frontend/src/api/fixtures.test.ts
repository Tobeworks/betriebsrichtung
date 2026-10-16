import { describe, expect, it } from "vitest";
import { beispielZeitachse } from "./fixtures";

describe("beispielZeitachse", () => {
  it("hat die Form der API-Antwort", () => {
    expect(beispielZeitachse.schema).toBe(1);
    expect(beispielZeitachse.timezone).toBe("Europe/Berlin");
    expect(beispielZeitachse.items.map((eintrag) => eintrag.status)).toEqual(["observed", "forecast", "forecast"]);
  });

  it("hält Wahrscheinlichkeiten im erlaubten Bereich", () => {
    for (const eintrag of beispielZeitachse.items) {
      if (eintrag.status === "forecast") {
        expect(eintrag.p_east).toBeGreaterThanOrEqual(0);
        expect(eintrag.p_east).toBeLessThanOrEqual(1);
      }
    }
  });
});
