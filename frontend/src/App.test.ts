import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory } from "vue-router";
import { describe, expect, it } from "vitest";
import App from "./App.vue";
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

describe("App", () => {
  it("bietet den Sprunglink und zeigt die Startseite mit Beispieldaten", async () => {
    const wrapper = await oeffne("/");
    expect(wrapper.text()).toContain("Zum Inhalt springen");
    expect(wrapper.find("h1").text()).toContain("Betriebsrichtung");
    expect(wrapper.text()).toContain("Beispieldaten");
    expect(wrapper.findAll("li").length).toBeGreaterThanOrEqual(3);
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
