import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { Eintrag } from "../../lib/zeitachse";
import AktuelleRichtung from "./AktuelleRichtung.vue";

function laufend(richtung: "east" | "west" | null): Eintrag {
  const jetzt = Date.now();
  return {
    status: "running", local_date: "2026-10-20", slot: "morning", start: new Date(jetzt - 3600000).toISOString(),
    end: new Date(jetzt + 3600000).toISOString(), east_share: richtung === "east" ? 1 : 0, actual_share: 0.5,
    east_actual: richtung === "east" ? 1 : 0, p_east_rest: null, known_until: new Date(jetzt).toISOString(), latest_direction: richtung,
  };
}

describe("AktuelleRichtung", () => {
  it("nennt bei Ost Starts nach Osten und Landungen aus Westen", () => {
    const text = mount(AktuelleRichtung, { props: { eintraege: [laufend("east")] } }).text();
    expect(text).toContain("BR 07 Ost");
    expect(text).toContain("Starts nach Osten");
    expect(text).toContain("Landungen aus Westen");
  });

  it("nennt bei West Starts nach Westen und Landungen aus Osten", () => {
    const text = mount(AktuelleRichtung, { props: { eintraege: [laufend("west")] } }).text();
    expect(text).toContain("Starts nach Westen");
    expect(text).toContain("Landungen aus Osten");
  });

  it("verwendet nirgends die missverständliche Formulierung Start und Landung nach", () => {
    expect(mount(AktuelleRichtung, { props: { eintraege: [laufend("east")] } }).text()).not.toContain("Start und Landung");
  });
});
