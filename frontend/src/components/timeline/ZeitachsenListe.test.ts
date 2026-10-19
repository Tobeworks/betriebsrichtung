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

// Ein Tag in der Zukunft, damit die Tests nicht mit dem Kalender altern (frühere Tage sind in der Liste ausgeblendet).
function morgen(): string {
  return lokalesDatum(new Date(Date.now() + 86400000));
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
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [{ ...prognose(morgen()), p_east: 0.5 }] } });
    const feld = wrapper.findAll("ul ul > li")[1].find("div");
    expect(feld.attributes("style")).toContain("--ost-anteil: 50%");
    expect(feld.classes().join(" ")).not.toContain("bg-muted");
  });

  it("fasst die Fenster eines Tages zu einer Karte zusammen und zeigt fehlende als keine Daten", () => {
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [prognose(morgen())] } });
    const karte = wrapper.find('ul[aria-label="Zeitachse"] > li');
    expect(karte.findAll("ul > li")).toHaveLength(3);
    expect(karte.text()).toContain("Vormittag");
    expect(karte.text()).toContain("Nacht");
    expect(karte.text().match(/keine Daten/g)).toHaveLength(2);
  });

  it("blendet frühere Tage standardmäßig aus und zeigt sie auf Knopfdruck", async () => {
    const gestern = lokalesDatum(new Date(Date.now() - 86400000));
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [prognose(gestern), prognose(lokalesDatum(new Date()))] } });
    expect(wrapper.findAll('ul[aria-label="Zeitachse"] > li')).toHaveLength(1);
    const knopf = wrapper.find("button");
    expect(knopf.text()).toContain("Frühere Tage anzeigen (1)");
    await knopf.trigger("click");
    expect(wrapper.findAll('ul[aria-label="Zeitachse"] > li')).toHaveLength(2);
    expect(knopf.attributes("aria-expanded")).toBe("true");
  });

  it("trennt Prognose und geschätzte Wahrheit sichtbar und markiert das laufende Fenster", () => {
    const jetzt = Date.now();
    const geschaetzt = {
      status: "estimated" as const, local_date: lokalesDatum(new Date()), slot: "afternoon" as const,
      start: new Date(jetzt - 3600000).toISOString(), end: new Date(jetzt + 3600000).toISOString(),
      runway_direction: "east" as const, east_share: 0.9, source: "wind_estimate" as const,
    };
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [geschaetzt, prognose(lokalesDatum(new Date(jetzt + 86400000)))] } });
    const text = wrapper.text();
    expect(text).toContain("Nachmittag, läuft");
    expect(text).toContain("geschätzt: Ost");
    expect(text).toContain("Prognose: offen");
    const zellen = wrapper.findAll("ul ul > li > div");
    const geschaetztZelle = zellen.find((z) => z.text().includes("geschätzt:"));
    const prognoseZelle = zellen.find((z) => z.text().includes("Prognose:"));
    expect(prognoseZelle?.classes().join(" ")).toContain("border-dashed");
    expect(geschaetztZelle?.classes().join(" ")).not.toContain("border-dashed");
  });

  it("zeigt das laufende Fenster als Mischung mit gepunktetem Rand", () => {
    const jetzt = Date.now();
    const laufend: Eintrag = {
      status: "running", local_date: lokalesDatum(new Date()), slot: "morning",
      start: new Date(jetzt - 3600000).toISOString(), end: new Date(jetzt + 3600000).toISOString(), east_share: 0.9,
      actual_share: 0.5, east_actual: 1, p_east_rest: 0.8, known_until: new Date(jetzt).toISOString(), latest_direction: "east",
    };
    const wrapper = mount(ZeitachsenListe, { props: { eintraege: [laufend] } });
    expect(wrapper.text()).toContain("Vormittag, läuft");
    expect(wrapper.text()).toContain("bisher geschätzt, Rest Prognose");
    const zelle = wrapper.findAll("ul ul > li > div").find((z) => z.text().includes("bisher geschätzt"));
    expect(zelle?.classes().join(" ")).toContain("border-dotted");
  });
});

