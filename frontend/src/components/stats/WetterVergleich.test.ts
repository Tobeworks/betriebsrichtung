import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { himmelsrichtung, zahl } from "../../lib/format";
import WetterVergleich from "./WetterVergleich.vue";

afterEach(() => vi.unstubAllGlobals());

const leer = {
  windows: 0, observations: 0, wind_speed_kn: null, wind_direction_deg: null, temperature_c: null, pressure_hpa: null,
  visibility_km: null, precipitation_share: null, low_ceiling_share: null, thunderstorm_share: null,
};

function antwort(ost: object, west: object, seit: string | null = "2026-10-11") {
  return {
    schema: 1, generated_at: "2026-10-18T10:00:00.000Z", days: 30, weather_since: seit, estimated_share: 1,
    groups: [{ direction: "east", ...leer, ...ost }, { direction: "west", ...leer, ...west }],
  };
}

function lade(inhalt: unknown) {
  const abruf = vi.fn(async () => new Response(JSON.stringify(inhalt), { status: 200 }));
  vi.stubGlobal("fetch", abruf);
  return abruf;
}

describe("WetterVergleich", () => {
  it("zeigt Wind, Temperatur, Druck, Sicht und Anteile je Richtung mit deutschem Format", async () => {
    lade(antwort(
      { windows: 12, observations: 190, wind_speed_kn: 6.24, wind_direction_deg: 62, temperature_c: 8.4, pressure_hpa: 1024.4,
        visibility_km: 9.1, precipitation_share: 0.05, low_ceiling_share: 0.12, thunderstorm_share: 0 },
      { windows: 30, observations: 480, wind_speed_kn: 11.5, wind_direction_deg: 250, temperature_c: 12.2, pressure_hpa: 1011.6,
        visibility_km: 9.9, precipitation_share: 0.2, low_ceiling_share: 0.3, thunderstorm_share: 0.01 },
    ));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("Wetter bei Ost und West");
    expect(text).toContain("ONO\u00a06,2\u00a0kn");
    expect(text).toContain("WSW 11,5 kn");
    expect(text).toContain("8,4 °C");
    expect(text).toContain("1024 hPa");
    expect(text).toContain("9,1 km");
    expect(text).toContain("5 %");
    expect(text).toContain("Wetterdaten seit 11.10.");
    expect(text).not.toContain("11.10..");
    expect(wrapper.find("table").exists()).toBe(true);
  });

  it("warnt bei wenigen Fenstern und zeigt Striche für eine Richtung ohne Meldungen", async () => {
    lade(antwort({ windows: 2, observations: 30, temperature_c: 9 }, {}));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    expect(wrapper.text()).toContain("Noch wenige Fenster");
    const zeilen = wrapper.findAll("tbody tr");
    const temperatur = zeilen.find((r) => r.text().startsWith("Temperatur"));
    expect(temperatur?.text()).toContain("9,0 °C");
    expect(temperatur?.text()).toContain("–");
  });

  it("warnt nicht, wenn beide Richtungen genug Fenster haben", async () => {
    lade(antwort({ windows: 10, observations: 100 }, { windows: 25, observations: 300 }));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Noch wenige Fenster");
  });

  it("sagt ehrlich, dass noch keine Auswertung vorliegt, wenn kein Wetter gespeichert ist", async () => {
    lade(antwort({}, {}, null));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    expect(wrapper.text()).toContain("erst seit kurzem gesammelt");
    expect(wrapper.find("table").exists()).toBe(false);
  });

  it("lädt mit einem anderen Zeitraum neu", async () => {
    const abruf = lade(antwort({ windows: 1, observations: 5 }, {}));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    await wrapper.setProps({ tage: 90 });
    await flushPromises();
    const adressen = abruf.mock.calls.map((a) => String((a as unknown[])[0]));
    expect(adressen[0]).toContain("days=30");
    expect(adressen[1]).toContain("days=90");
  });

  it("zeigt bei einem Verbindungsfehler eine Meldung mit Knopf", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const wrapper = mount(WetterVergleich, { props: { tage: 30 } });
    await flushPromises();
    expect(wrapper.find('[role="alert"]').text()).toContain("Verbindung");
  });
});

describe("Formatierung", () => {
  it("nennt die Himmelsrichtung in 16 Sektoren und rechnet über 360 Grad hinweg", () => {
    expect(himmelsrichtung(0)).toBe("N");
    expect(himmelsrichtung(359)).toBe("N");
    expect(himmelsrichtung(62)).toBe("ONO");
    expect(himmelsrichtung(250)).toBe("WSW");
    expect(himmelsrichtung(-10)).toBe("N");
  });

  it("schreibt Zahlen mit Komma", () => {
    expect(zahl(6.24)).toBe("6,2");
    expect(zahl(1024.4, 0)).toBe("1024");
  });
});
