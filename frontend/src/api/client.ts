import type { Fehlerantwort } from "./generated/error";
import type { AntwortPrognosegute } from "./generated/evaluation.response";
import type { AntwortZeitachse } from "./generated/timeline.response";

const ZEITLIMIT_MS = 10000;

export class ApiFehler extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiFehler";
  }
}

const basis = String(import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export const beispielModus = import.meta.env.VITE_BEISPIELDATEN === "true";

export function holeZeitachse(von: string, bis: string, signal?: AbortSignal): Promise<AntwortZeitachse> {
  const abfrage = new URLSearchParams({ from: von, to: bis });
  return anfrage<AntwortZeitachse>(`/timeline?${abfrage.toString()}`, signal);
}

export function holeGuete(tage: number, signal?: AbortSignal): Promise<AntwortPrognosegute> {
  return anfrage<AntwortPrognosegute>(`/evaluation?days=${tage}`, signal);
}

async function anfrage<T>(pfad: string, signal?: AbortSignal): Promise<T> {
  const zeitgeber = new AbortController();
  const timer = setTimeout(() => zeitgeber.abort(), ZEITLIMIT_MS);
  const abbrechen = () => zeitgeber.abort();
  signal?.addEventListener("abort", abbrechen);
  try {
    const antwort = await fetch(`${basis}/betriebsrichtung/v1${pfad}`, {
      headers: { Accept: "application/json" },
      signal: zeitgeber.signal,
    });
    if (!antwort.ok) {
      const inhalt = (await antwort.json().catch(() => null)) as Partial<Fehlerantwort> | null;
      throw new ApiFehler(
        inhalt?.code ?? "HTTP_FEHLER",
        inhalt?.error ?? "Die Prognose konnte nicht geladen werden.",
        antwort.status,
      );
    }
    return (await antwort.json()) as T;
  } catch (fehler) {
    if (fehler instanceof ApiFehler) {
      throw fehler;
    }
    if (signal?.aborted) {
      throw fehler;
    }
    if (zeitgeber.signal.aborted) {
      throw new ApiFehler("ZEITLIMIT", "Die Anfrage hat zu lange gedauert.", 0);
    }
    throw new ApiFehler("NETZ_FEHLER", "Die Verbindung ist fehlgeschlagen.", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abbrechen);
  }
}
