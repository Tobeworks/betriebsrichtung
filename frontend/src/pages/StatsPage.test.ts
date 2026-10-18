import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import StatsPage from "./StatsPage.vue";

afterEach(() => vi.unstubAllGlobals());

function antwort(items: unknown[]) {
  return { schema: 1, generated_at: "2026-10-18T10:00:00.000Z", data_through: "2026-10-18T10:00:00.000Z", timezone: "Europe/Berlin",
    skill_horizon_days: 7, skill_horizon_provisional: true, items };
}

function fenster(slot: string, start: string, ende: string, share: number) {
  return { status: "estimated", local_date: "2026-10-17", slot, start, end: ende, runway_direction: share > 0.5 ? "east" : "west",
    east_share: share, source: "wind_estimate" };
}

describe("StatsPage", () => {
  it("zeigt Kennzahlen, Tagesdiagramm und Profil aus der Zeitachse", async () => {
    const items = [fenster("morning", "2026-10-17T04:00:00.000Z", "2026-10-17T12:00:00.000Z", 1),
      fenster("afternoon", "2026-10-17T12:00:00.000Z", "2026-10-17T20:00:00.000Z", 0)];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(antwort(items)), { status: 200 })));
    const wrapper = mount(StatsPage);
    await flushPromises();
    expect(wrapper.text()).toContain("Ostanteil");
    expect(wrapper.text()).toContain("50\u00a0%");
    expect(wrapper.text()).toContain("0 / 1");
    expect(wrapper.find("svg").exists()).toBe(true);
    expect(wrapper.text()).toContain("Datenbasis: 2 Fenster (17.10. bis 17.10.)");
    expect(wrapper.text()).toContain("aus gemessenem Wind");
  });

  it("zeigt ohne Daten einen Hinweis statt leerer Kennzahlen", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(antwort([])), { status: 200 })));
    const wrapper = mount(StatsPage);
    await flushPromises();
    expect(wrapper.text()).toContain("noch keine Daten");
    expect(wrapper.find("dl").exists()).toBe(false);
  });

  it("zeigt bei Verbindungsfehler eine Meldung mit Knopf zum erneuten Laden", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const wrapper = mount(StatsPage);
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain("Verbindung");
    expect(wrapper.find("button").text()).toContain("Erneut versuchen");
  });
});
