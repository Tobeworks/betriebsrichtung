const ZEITZONE = "Europe/Berlin";

const datumFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: ZEITZONE,
});

const wochentagFormat = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: ZEITZONE });

const uhrzeitFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: ZEITZONE,
});

const isoDatumFormat = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: ZEITZONE,
});

const versatzFormat = new Intl.DateTimeFormat("en-US", { timeZone: ZEITZONE, timeZoneName: "longOffset" });

// Zeitstempel (ms) für "datum, stunde Uhr" in Europe/Berlin.
export function lokaleZeit(datum: string, stunde: number): number {
  const roh = Date.parse(`${datum}T${String(stunde).padStart(2, "0")}:00:00Z`);
  const name = versatzFormat.formatToParts(new Date(roh)).find((teil) => teil.type === "timeZoneName")?.value ?? "";
  const treffer = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(name);
  const versatz = treffer ? (treffer[1] === "-" ? -1 : 1) * (Number(treffer[2]) * 60 + Number(treffer[3] ?? 0)) * 60000 : 0;
  return roh - versatz;
}

export function formatDatum(lokalesDatum: string): string {
  return datumFormat.format(new Date(`${lokalesDatum}T12:00:00Z`));
}

export function formatWochentag(lokalesDatum: string): string {
  return wochentagFormat.format(new Date(`${lokalesDatum}T12:00:00Z`));
}

export function ganzProzent(anteil: number): string {
  return `${Math.round(anteil * 100)}\u00a0%`;
}

export function formatDauer(stunden: number): string {
  const tage = Math.floor(stunden / 24);
  const rest = stunden % 24;
  if (tage === 0) {
    return `${rest}\u00a0Std.`;
  }
  return `${tage}\u00a0${tage === 1 ? "Tag" : "Tage"}${rest === 0 ? "" : ` ${rest}\u00a0Std.`}`;
}

// Kurz für schmale Karten: bis 72 Stunden in Stunden, darüber in Tagen.
export function formatDauerKurz(stunden: number): string {
  if (stunden < 72) {
    return `${stunden}\u00a0Std.`;
  }
  const tage = Math.round((stunden / 24) * 10) / 10;
  return `${String(tage).replace(".", ",")}\u00a0Tage`;
}

export function formatTagMonat(lokalesDatum: string): string {
  return `${lokalesDatum.slice(8, 10)}.${lokalesDatum.slice(5, 7)}.`;
}

export function formatUhrzeit(zeitpunkt: string): string {
  return uhrzeitFormat.format(new Date(zeitpunkt));
}

export function lokalesDatum(zeit: Date): string {
  return isoDatumFormat.format(zeit);
}
