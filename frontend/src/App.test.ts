import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory } from "vue-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.vue";
import { beispielZeitachse } from "./api/fixtures";
import { erstelleRouter } from "./router";

async function oeffne(pfad: string) {
  const router = erstelleRouter(createMemoryHistory());
  await router.push(pfad);
  await router.isReady();
  const wrapper = mount(App, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

Object.defineProperty(window, "scrollTo", { value: () => undefined, writable: true });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("App", () => {
  it("bietet den Sprunglink und zeigt die Zeitachse aus der API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(beispielZeitachse), { status: 200 })));
    const wrapper = await oeffne("/");
    expect(wrapper.text()).toContain("Zum Inhalt springen");
    expect(wrapper.find("h1").text()).toContain("Betriebsrichtung");
    expect(wrapper.findAll("li").length).toBeGreaterThanOrEqual(3);
  });

  it("zeigt bei fehlender Verbindung eine Fehlermeldung statt Beispieldaten", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const wrapper = await oeffne("/");
    expect(wrapper.find('[role="alert"]').text()).toContain("Die Verbindung ist fehlgeschlagen.");
    expect(wrapper.text()).not.toContain("Beispieldaten");
  });

  it("zeigt für unbekannte Pfade die 404-Seite", async () => {
    const wrapper = await oeffne("/gibt-es-nicht");
    expect(wrapper.find("h1").text()).toContain("Seite nicht gefunden");
  });

  it("zeigt die Hauptnavigation mit allen vier Zielen", async () => {
    const wrapper = await oeffne("/");
    const hauptnavigation = wrapper.findAll('nav[aria-label="Hauptnavigation"]');
    expect(hauptnavigation).toHaveLength(2);
    expect(hauptnavigation[1]?.findAll("a")).toHaveLength(4);
  });
});
