const ZEITZONE = "Europe/Berlin";

const datumFormat = new Intl.DateTimeFormat("de-DE", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: ZEITZONE,
});

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

export function formatDatum(lokalesDatum: string): string {
  return datumFormat.format(new Date(`${lokalesDatum}T12:00:00Z`));
}

export function formatUhrzeit(zeitpunkt: string): string {
  return uhrzeitFormat.format(new Date(zeitpunkt));
}

export function lokalesDatum(zeit: Date): string {
  return isoDatumFormat.format(zeit);
}
