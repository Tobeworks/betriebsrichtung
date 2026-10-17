import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { lokalesDatum } from "../../lib/format";
import type { Eintrag } from "../../lib/zeitachse";
import ZeitachsenListe from "./ZeitachsenListe.vue";

function prognose(datum: string): Eintrag {
  return {
    status: "forecast", local_date: datum, slot: "afternoon", start: `${datum}T12:00:00.000Z`,
    end: `${datum}T20:00:00.000Z`, p_east: 0.5, p_east_raw: 0.5, lead_hours: 10,
    computed_at: `${datum}T00:00:00.000Z`, members: 100, calibrated: false,
  };
}

describe("ZeitachsenListe", () => {
  it("markiert nur die Zeilen des heutigen Tages", () => {
    const jetzt = new Date();
    const morgen = lokalesDatum(new Date(jetzt.getTime() + 86400000));
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [prognose(lokalesDatum(jetzt)), prognose(morgen)] } });
    const zeilen = wrapper.findAll('ul[aria-label="Zeitachse"] > li');
    expect(zeilen).toHaveLength(2);
    expect(zeilen[0].attributes("aria-current")).toBe("date");
    expect(zeilen[0].text()).toContain("Heute");
    expect(zeilen[1].attributes("aria-current")).toBeUndefined();
    expect(zeilen[1].text()).not.toContain("Heute");
  });

  it("färbt Prognosen nach Ostwahrscheinlichkeit, auch bei 50 %", () => {
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [{ ...prognose("2026-10-18"), p_east: 0.5 }] } });
    const feld = wrapper.findAll("ul ul > li")[1].find("div");
    expect(feld.attributes("style")).toContain("--ost-anteil: 50%");
    expect(feld.classes().join(" ")).not.toContain("bg-muted");
  });

  it("fasst die Fenster eines Tages zu einer Karte zusammen und zeigt fehlende als keine Daten", () => {
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [prognose("2026-10-18")] } });
    const karte = wrapper.find('ul[aria-label="Zeitachse"] > li');
    expect(karte.findAll("ul > li")).toHaveLength(3);
    expect(karte.text()).toContain("Vormittag");
    expect(karte.text()).toContain("Nacht");
    expect(karte.text().match(/keine Daten/g)).toHaveLength(2);
  });
});
