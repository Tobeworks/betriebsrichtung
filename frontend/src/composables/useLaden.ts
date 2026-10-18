import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import { ApiFehler } from "../api/client";
import { texte } from "../config/texte";

// Lädt beim Einhängen einmal Daten und bietet erneutes Laden bei Fehlern. Abgebrochene Anfragen melden keinen Fehler.
export function useLaden<T>(lader: (signal: AbortSignal) => Promise<T>) {
  const daten = ref<T | null>(null) as Ref<T | null>;
  const laedt = ref(true);
  const fehler = ref<string | null>(null);
  let steuerung: AbortController | null = null;

  async function laden(): Promise<void> {
    steuerung?.abort();
    const aktuell = new AbortController();
    steuerung = aktuell;
    laedt.value = true;
    fehler.value = null;
    try {
      daten.value = await lader(aktuell.signal);
    } catch (ausnahme) {
      if (aktuell.signal.aborted) {
        return;
      }
      fehler.value = ausnahme instanceof ApiFehler ? ausnahme.message : texte.fehlerLaden;
    } finally {
      if (steuerung === aktuell) {
        laedt.value = false;
      }
    }
  }

  onMounted(laden);
  onBeforeUnmount(() => steuerung?.abort());

  return { daten, laedt, fehler, laden };
}
