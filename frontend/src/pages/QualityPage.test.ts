import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import QualityPage from "./QualityPage.vue";

afterEach(() => vi.unstubAllGlobals());

const klasse = (lead_class: string, comparisons: number, hit_rate: number | null) => ({
  lead_class, comparisons, hit_rate, hit_rate_west: comparisons ? 0.75 : null, brier: comparisons ? 0.12 : null,
  brier_west: comparisons ? 0.25 : null, skill_west: comparisons ? 0.52 : null,
});

function antwort(windows: number, classes: unknown[]) {
  return { schema: 1, generated_at: "2026-10-18T10:00:00.000Z", days: 90, windows, east_share: windows ? 0.25 : null,
    estimated_share: windows ? 1 : null, classes };
}

describe("QualityPage", () => {
  it("zeigt Trefferquote gegen immer West je Vorlaufklasse und warnt vor geschätzter Wahrheit", async () => {
    const classes = [klasse("1_tag", 12, 0.83), klasse("2_3_tage", 3, 0.67), klasse("4_7_tage", 0, null), klasse("8_14_tage", 0, null)];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(antwort(12, classes)), { status: 200 })));
    const wrapper = mount(QualityPage);
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("bis 1 Tag vorher");
    expect(text).toContain("83\u00a0%");
    expect(text).toContain("75\u00a0%");
    expect(text).toContain("12 Vergleiche");
    expect(text).toContain("noch wenige Vergleiche");
    expect(text).toContain("noch keine Vergleiche");
    expect(text).toContain("Vorläufig: 12 Fenster verglichen");
    expect(text).toContain("100\u00a0% davon stützen sich auf eine aus Messwind geschätzte Wahrheit");
  });

  it("zeigt ohne Vergleichsfenster einen verständlichen Hinweis", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(antwort(0, [])), { status: 200 })));
    const wrapper = mount(QualityPage);
    await flushPromises();
    expect(wrapper.text()).toContain("noch keine abgelaufenen Fenster");
  });
});
