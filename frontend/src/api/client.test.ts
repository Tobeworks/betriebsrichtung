import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiFehler, holeZeitachse } from "./client";
import { beispielZeitachse } from "./fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("holeZeitachse", () => {
  it("liefert die Antwort und übergibt den Zeitraum als from und to", async () => {
    const aufruf = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(beispielZeitachse), { status: 200 }));
    vi.stubGlobal("fetch", aufruf);
    const ergebnis = await holeZeitachse("2026-10-09", "2026-10-30");
    expect(ergebnis.items).toHaveLength(3);
    const adresse = String(aufruf.mock.calls[0]?.[0]);
    expect(adresse).toContain("/betriebsrichtung/v1/timeline");
    expect(adresse).toContain("from=2026-10-09");
    expect(adresse).toContain("to=2026-10-30");
  });

  it("übernimmt Code und Meldung aus einer Fehlerantwort", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ status: 0, error: "Zeitraum ist zu groß", code: "ZEITRAUM_ZU_GROSS" }), {
          status: 422,
        }),
      ),
    );
    const fehler = await holeZeitachse("2026-01-01", "2026-12-31").catch((e: unknown) => e);
    expect(fehler).toBeInstanceOf(ApiFehler);
    expect((fehler as ApiFehler).code).toBe("ZEITRAUM_ZU_GROSS");
    expect((fehler as ApiFehler).status).toBe(422);
  });

  it("meldet einen Verbindungsfehler als NETZ_FEHLER", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const fehler = await holeZeitachse("2026-10-09", "2026-10-30").catch((e: unknown) => e);
    expect((fehler as ApiFehler).code).toBe("NETZ_FEHLER");
  });
});
