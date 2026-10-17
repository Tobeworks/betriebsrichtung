import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { lokalesDatum } from "../../lib/format";
import type { Eintrag } from "../../lib/zeitachse";
import ZeitachsenDiagramm from "./ZeitachsenDiagramm.vue";

function prognose(slot: "afternoon" | "night", start: string, end: string): Eintrag {
  const datum = lokalesDatum(new Date());
  return { status: "forecast", local_date: datum, slot, start, end, p_east: 0.5, p_east_raw: 0.5, lead_hours: 1,
    computed_at: start, members: 10, calibrated: false };
}

describe("ZeitachsenDiagramm", () => {
  it("zeichnet je Fenster eine West- und eine Ostsäule samt Legende", () => {
    const jetzt = Date.now();
    const wrapper = mount(ZeitachsenDiagramm, {
      props: { eintraege: [
        prognose("afternoon", new Date(jetzt - 3600000).toISOString(), new Date(jetzt + 3600000).toISOString()),
        prognose("night", new Date(jetzt + 3600000).toISOString(), new Date(jetzt + 7200000).toISOString()),
      ] },
    });
    expect(wrapper.findAll("rect.fill-west")).toHaveLength(2);
    expect(wrapper.findAll("rect.fill-east")).toHaveLength(2);
    expect(wrapper.text()).toContain("BR 25 West");
    expect(wrapper.text()).toContain("Jetzt");
  });

  it("zeigt nichts, wenn keine Daten vorliegen", () => {
    expect(mount(ZeitachsenDiagramm, { props: { eintraege: [] } }).find("figure").exists()).toBe(false);
  });
});
