import { onBeforeUnmount, onMounted, ref } from "vue";
import { ApiFehler, beispielModus, holeZeitachse } from "../api/client";
import { beispielZeitachse } from "../api/fixtures";
import type { AntwortZeitachse } from "../api/generated/timeline.response";
import { texte } from "../config/texte";
import { lokalesDatum } from "../lib/format";

const TAGE_RUECKBLICK = 7;
const TAGE_VORSCHAU = 14;

function zeitraum(): { von: string; bis: string } {
  const heute = new Date();
  const von = new Date(heute.getTime() - TAGE_RUECKBLICK * 86400000);
  const bis = new Date(heute.getTime() + TAGE_VORSCHAU * 86400000);
  return { von: lokalesDatum(von), bis: lokalesDatum(bis) };
}

export function useZeitachse() {
  const daten = ref<AntwortZeitachse | null>(null);
  const laedt = ref(true);
  const fehler = ref<string | null>(null);
  const beispiel = beispielModus;
  let steuerung: AbortController | null = null;

  async function laden(): Promise<void> {
    steuerung?.abort();
    steuerung = new AbortController();
    laedt.value = true;
    fehler.value = null;
    try {
      if (beispiel) {
        daten.value = beispielZeitachse;
      } else {
        const { von, bis } = zeitraum();
        daten.value = await holeZeitachse(von, bis, steuerung.signal);
      }
    } catch (ausnahme) {
      if (steuerung.signal.aborted) {
        return;
      }
      fehler.value = ausnahme instanceof ApiFehler ? ausnahme.message : texte.fehlerLaden;
    } finally {
      laedt.value = false;
    }
  }

  onMounted(laden);
  onBeforeUnmount(() => steuerung?.abort());

  return { daten, laedt, fehler, beispiel, laden };
}
