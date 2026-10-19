import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { lokalesDatum } from "../../lib/format";
import type { Eintrag } from "../../lib/zeitachse";
import HistorieListe from "./HistorieListe.vue";

const TAG = 86400000;

function wahrheit(tageZurueck: number, slot: Eintrag["slot"], ost: number | null): Eintrag {
  const datum = lokalesDatum(new Date(Date.now() - tageZurueck * TAG));
  const start = new Date(`${datum}T12:00:00Z`).toISOString();
  return {
    status: ost === null ? "gap" : "estimated", local_date: datum, slot, start, end: start,
    runway_direction: ost === null ? null : ost > 0.5 ? "east" : "west", east_share: ost, source: null,
  };
}

describe("HistorieListe", () => {
  it("zeigt vergangene Tage, neueste zuerst, mit der stärkeren Richtung und ihrem Anteil", () => {
    const wrapper = mount(HistorieListe, {
      props: { eintraege: [wahrheit(2, "morning", 0), wahrheit(1, "morning", 1), wahrheit(1, "afternoon", 0.25), wahrheit(1, "night", 0.5)] },
    });
    const zeilen = wrapper.findAll("tbody tr");
    expect(zeilen).toHaveLength(2);
    expect(zeilen[0].text()).toContain("Ost 100 %");
    expect(zeilen[0].text()).toContain("West 75 %");
    expect(zeilen[0].text()).toContain("offen 50 %");
    expect(zeilen[1].text()).toContain("West 100 %");
  });

  it("zeigt Lücken und fehlende Fenster als Strich und blendet Tage ohne jede Wahrheit aus", () => {
    const wrapper = mount(HistorieListe, { props: { eintraege: [wahrheit(1, "morning", 1), wahrheit(1, "afternoon", null), wahrheit(3, "night", null)] } });
    expect(wrapper.findAll("tbody tr")).toHaveLength(1);
    expect(wrapper.findAll("tbody td").map((td) => td.text())).toEqual(["Ost 100 %", "–", "–"]);
  });

  it("zeigt zunächst 10 Tage und den Rest auf Knopfdruck", async () => {
    const eintraege = Array.from({ length: 20 }, (_, i) => wahrheit(i + 1, "morning", 1));
    const wrapper = mount(HistorieListe, { props: { eintraege } });
    expect(wrapper.findAll("tbody tr")).toHaveLength(10);
    await wrapper.find("button").trigger("click");
    expect(wrapper.findAll("tbody tr")).toHaveLength(20);
  });

  it("zeigt einen Hinweis, wenn es keine Historie gibt", () => {
    const wrapper = mount(HistorieListe, { props: { eintraege: [] } });
    expect(wrapper.text()).toContain("keine Historie");
    expect(wrapper.find("table").exists()).toBe(false);
  });
});
