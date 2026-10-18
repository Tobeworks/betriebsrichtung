# Frontend (Phase 8, Gerüst)

Stand: 2026-10-16. Die App ist eine Vite-SPA mit Vue 3 und TypeScript im Verzeichnis `frontend/`. Diese Phase liefert das lauffähige Gerüst: Routen, Layout, Tokens, API-Client mit den generierten Typen, Platzhalterseiten und eine Zeitachse mit Beispieldaten. Die eigentliche Zeitachse mit Details folgt in Phase 9.

## Befehle

Im Verzeichnis `frontend/` mit dem in `packageManager` festgelegten pnpm (11.28.3):

```
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
```

Container lokal: `docker build -t betriebsrichtung-frontend ./frontend`, danach `docker run -p 8080:80 betriebsrichtung-frontend`.

Die API-Basis kommt aus `VITE_API_BASE` (Build-Argument im Dockerfile). Ohne diesen Wert zeigt die Startseite Beispieldaten aus `src/api/fixtures.ts`.

## Struktur

```
frontend/
  src/
    main.ts              Einstieg, Schrift, Styles, Router
    App.vue              Layout: Sprunglink, Kopf, Hauptbereich, untere Leiste, Fuß
    router.ts            Routen, Titel pro Seite, Fokus nach Navigation
    styles/global.css    Tokens im @theme-Block, Utility-Klassen, Fokus-Stil
    config/              Seitenname, alle sichtbaren Texte
    lib/                 Formatierung (Europe/Berlin), Einordnung, Zeitachsen-Beschreibung
    api/                 Client (fetch, Zeitlimit, Fehlernormalisierung), Fixtures, generierte Typen
    composables/         useZeitachse (Laden, Fehler, Beispielmodus)
    components/          layout/ und timeline/
    pages/               Startseite, Platzhalter, 404
  nginx.conf, Dockerfile
```

## Design-Tokens

Alle Farben und Abstände kommen aus `src/styles/global.css`. Komponenten enthalten keine Hex-Werte und keine rohen Farbklassen.

| Token | Wert | Verwendung |
|---|---|---|
| `background`, `foreground` | `#ffffff`, `#1e293b` | Seite und Schrift |
| `muted`, `muted-foreground` | `#f1f5f9`, `#475569` | Nebenflächen, Nebentext |
| `border` | `#cbd5e1` | Rahmen, gestrichelte Lücken |
| `ring` | `#0f766e` | Fokusrahmen |
| `west`, `west-fg` | `#c8e725`, dunkle Schrift | Westbetrieb, Fläche |
| `east`, `east-fg` | `#00adbb`, dunkle Schrift | Ostbetrieb, Fläche |
| `west-50` bis `west-900`, `east-50` bis `east-900` | abgeleitet per `color-mix` in OKLCH | Abstufungen |
| `warning`, `warning-fg` | `#fef3c7`, `#78350f` | Warnhinweis |
| `danger`, `danger-fg` | `#fee2e2`, `#991b1b` | Fehler |

West und Ost tragen nie die Farbe allein. Jede Zelle zeigt den Richtungstext, etwa "West, beobachtet" oder "tendenziell Ost, Ostbetrieb 60 %".

## Utility-Klassen

| Klasse | Zweck |
|---|---|
| `page-container` | Maximalbreite, Seitenrand 1 rem |
| `heading-page`, `heading-section` | Überschriften |
| `section-eyebrow` | Kleine Zeile über der Überschrift |
| `stat-number` | Kennzahl mit tabellarischen Ziffern |
| `text-fine` | Kleiner Nebentext |
| `hairline` | Rahmen 0,0625 rem in der Rahmenfarbe |
| `touch-target` | Mindesthöhe und -breite 2,75 rem, `touch-action: manipulation` |
| `pattern-estimated` | Schraffur für geschätzte Historie (`wind_estimate`) |

## Abweichungen vom Plan

- **shadcn-vue ist nicht eingebaut.** Die CLI ist nicht gelaufen, und die Basis Reka UI fehlt. Die Komponenten sind hier einfache Markup-Bausteine mit denselben Tokens. Die shadcn-Komponenten folgen mit Phase 9 nach Abnahme des Prototyps.
- **Icons:** `@lucide/vue` statt `lucide-vue-next`. Letzteres ist laut npm abgekündigt, der Icon-Satz ist derselbe.
- **Farbabstufungen:** Die Skalen sind per `color-mix` aus den Grundfarben abgeleitet, nicht mit dem Shade-Generator des Website-Workflows. Die Werte sollten später mit dem Generator nachgerechnet werden.
- **Schrift:** Fontsource Variable Inter. Der Build enthält alle Teilmengen, der Browser lädt aber nur die benötigte per `unicode-range`. Die lateinische Teilmenge wird im Regelbetrieb geladen.
- **Versionen:** Alle Pakete sind exakt gepinnt und mindestens 14 Tage alt zum Zeitpunkt der Auswahl. `pnpm-lock.yaml` ist eingecheckt.
- **Kein Dark Mode**, die Tokens sind aber so angelegt, dass er später über die Variablen folgen kann.

## Seiten Verlauf, Statistik und Güte

- **Verlauf (`/`):** Kachel "Aktuell" mit großem Flugzeug (türkis Ost, grün West, gespiegelt nach der Richtung), darunter Diagramm der nächsten sieben Tage und Tageskarten mit Vormittag, Nachmittag und Nacht. Begonnene Fenster zeigen die aus Messwind geschätzte Wahrheit ("geschätzt: ..."), künftige die Prognose ("Prognose: ...", blass und gestrichelt). Beschriftung: unter 25 Prozent "West", 25 bis 40 "tendenziell West", 40 bis 60 "offen", 60 bis 75 "tendenziell Ost", ab 75 "Ost".
- **Statistik (`/statistik`):** Rechnet das Frontend aus der Zeitachse der letzten 30 Tage (`lib/statistik.ts`): Ostanteil, Tage mit überwiegend Ost, längste Ostphase, Ostanteil je Tag und je Tageszeit. Ein Tag zählt als überwiegend Ost bei mehr als 50 Prozent. Der Vergleichswert von etwa einem Viertel Ost im langjährigen Mittel stammt aus der Erklärseite des Umwelthauses.
- **Güte (`/prognosegute`):** Liest `GET /betriebsrichtung/v1/evaluation?days=90`. Die API vergleicht je abgelaufenem Fenster mit Wahrheit die Prognose der jeweiligen Vorlaufklasse (bis 1 Tag, 2 bis 3, 4 bis 7, 8 bis 14 Tage; je Fenster und Klasse die letzte Prognose) mit dem Ergebnis. Gezeigt werden Trefferquote bei Schwelle 0,5 gegen die Baseline "immer West"; Brier-Score und Verbesserung stehen im aufklappbaren Erklärbereich. Solange die Wahrheit aus Messwind geschätzt ist, steht ein Hinweis dabei, und unter 20 Vergleichen "noch wenige Vergleiche".
- **Dev-Server:** Der Proxy setzt `Cache-Control: no-store`, damit ein lokaler Joblauf sofort sichtbar ist. Die echte API cached fünf Minuten.

## Noch offen

- **Content-Security-Policy:** Fehlt. Sie braucht die API-Domain in `connect-src`, die erst mit dem Deploy feststeht.
- **BugDrop:** Nicht eingebaut. Die Skript-URL fehlt, und das Widget gehört nur in den Develop-Build (Plan 11d).
- **Staging-Deploy und GHCR-Push:** Nicht ausgeführt, das gehört zum Netcup-Repo (Plan 11b, 11c). Der CI-Workflow `frontend.yaml` prüft Typen, Tests, Build und das Docker-Image, veröffentlicht aber nichts.
- **Routen ohne Status:** `/gibt-es-nicht` liefert HTTP 200 mit der 404-Seite der App. Ein echter 404-Statuscode bräuchte eine Routenliste im Server, der Plan verzichtet bewusst darauf.
- **Lighthouse und Geräteprüfung:** Noch nicht gelaufen. Vorgesehen sind `lighthouse-lokal` gegen den Container und die mobile Abnahme auf echten Geräten.

## Mobile Abnahme

Jede Seite wird einzeln abgehakt, bevor Phase 9 und 10 abgenommen werden (Plan 10k).

- [ ] Einhandbedienung: häufige Aktionen liegen im unteren Drittel
- [ ] Untere Leiste mit vier Zielen, Höhe mindestens 3,5 rem plus Safe-Area
- [ ] Alle Antippflächen mindestens 2,75 rem, Abstand mindestens 0,5 rem
- [ ] Kein horizontaler Seitenscroll bei 320, 360, 375 und 768 Pixel
- [ ] Querformat bleibt bedienbar, nichts wird abgeschnitten
- [ ] Textvergrößerung bis 200 Prozent ohne Überlappung
- [ ] Sprunglink und Fokus nach Navigation funktionieren mit Tastatur
- [ ] Beispieldaten und Fehlerzustand sind lesbar und haben Text, nicht nur Farbe
- [ ] Auf einem echten iPhone (Safari) und einem Android-Gerät (Chrome) geprüft
