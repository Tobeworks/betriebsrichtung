# Auftrag: Betriebsrichtungs-App (Prognose und Historie, Flughafen Frankfurt)

Stand dieser Fassung: 2026-10-16. Dies ist ein reiner Planungsdokument, es wird noch kein Code geschrieben.

## 0. Was sich gegenüber der ersten Fassung geändert hat

- Bestandsaufnahme der bestehenden API ist eingearbeitet (Abschnitt 2a). Wichtigste Folge: Es gibt dort bisher **kein** Generator-Werkzeug und nur **ein** Schema, die Generatoren werden also neu gebaut und knüpfen an die vorhandenen Muster an.
- Das Frontend ist eine **Vue-3-Single-Page-App mit Vite, ohne Astro**. Die Regeln aus dem Tobeworks-Website-Workflow (Tailwind v4 mit Tokens, nur rem, keine Inline-Styles, wiederverwendbare Utility-Klassen, Fontsource, Barrierefreiheit, 404, Versionierung, Docker, ArgoCD, zwei Umgebungen) gelten weiter, soweit sie nicht Astro-spezifisch sind (Abschnitt 10 und 11).
- Fachliche Logik ist präzisiert: Definition der "Wahrheit" pro Zeitfenster, Zustandsautomat mit Hysterese, Anfangszustand aus der Beobachtung, Zwei-Stufen-Kalibrierung, Baselines inklusive Klimatologie und Persistenz, Skill Score, Reliability-Diagramm (Abschnitt 4).
- Datenquellen mit konkreten Kandidaten und einer Bewertungsmatrix ergänzt, darunter METAR und DWD als Windbeobachtung (Abschnitt 3).
- Neue Entitäten: `ForecastRun`, `ForecastConfig`, `JobRun`, `SlotActual` (Abschnitt 6).
- API-Endpunkte konkretisiert, inklusive eines vorberechneten Zeitachsen-Endpunkts (Abschnitt 8).
- Betrieb, Monitoring, Teststrategie, Risiken und Entscheidungsprotokoll ergänzt (Abschnitte 12 bis 15 und 18).
- **Mobile-Komfort ist oberste Gestaltungspriorität** und hat einen eigenen Abschnitt 10k (Daumenzone, Bottom Sheets mit Zurück-Taste, Zwischenspeicher für sofortige Anzeige, Diagramme für den Finger, Prüfung auf echten Geräten). Sie fließt in Abnahme, Tests und Phasen ein.
- Reihenfolge angepasst: Datensammler (Beobachtung und Forecast-Archiv) werden vor Lese-API und Frontend gebaut, weil sich Ensemble-Archive nicht nachträglich erzeugen lassen (Abschnitt 16).

## 1. Ziel

Eine kleine App, die für den Frankfurter Flughafen zeigt:

- **Blick in die Zukunft:** Wahrscheinlichkeit für Ostbetrieb (Betriebsrichtung 07) für die nächsten ca. 14 Tage, pro Zeitfenster.
- **Blick in die Vergangenheit:** Welche Betriebsrichtung tatsächlich lief, mit Statistik.
- **Prognosegüte:** Wie gut die eigene Prognose war, aufgeschlüsselt nach Vorlaufzeit.

Hintergrund: Bei Ostbetrieb werden die Landeanflüge auf die Landebahn Nordwest über Ginsheim-Gustavsburg geführt, was dort zu erheblichem Fluglärm führt. Ostbetrieb tritt im Jahresschnitt etwa 25 bis 30 Prozent der Zeit auf. Die App soll helfen, ruhigere und lautere Phasen besser einzuschätzen. Es gibt keine Garantie, die Prognose ist probabilistisch.

Zeitfenster (Lokalzeit Europe/Berlin), angelehnt an die Prognose des Umwelthauses:

- `morning`: 06:00 bis 14:00
- `afternoon`: 14:00 bis 22:00
- `night`: 22:00 bis 06:00

Das Fenster `night` gehört zu dem lokalen Kalendertag, an dem es beginnt (die Nacht vom 14. auf den 15. ist `night` des 14.).

### 1a. Zielgruppe und Nutzung

- Primär: Anwohnerinnen und Anwohner, die Terrasse, Fenster, Schlaf oder Veranstaltungen planen. Typische Fragen: "Wie wird das Wochenende?", "War es wirklich öfter Ost als früher?", "Kann ich der Prognose trauen?"
- Nutzung überwiegend mobil, kurze Sitzungen, oft nur ein Blick auf "heute und die nächsten Tage".
- Kein Fachpublikum. Fachbegriffe (Brier-Score, Skill) erscheinen nur in einem aufklappbaren Erklärbereich, im Haupttext stehen verständliche Aussagen.

### 1b. Nicht-Ziele

- Keine amtliche Auskunft, kein Ersatz für Fraport, DFS oder Umwelthaus.
- Keine Lärmpegel- oder Flugzeugzahlprognose, keine Echtzeit-Flugverfolgung.
- Keine Prognose einzelner Flüge oder Tageszeiten unterhalb der drei Zeitfenster.

### 1c. Glossar

- **Betriebsrichtung:** Richtung, in die gestartet und gelandet wird. West = Bahnrichtung 25 (Anflug aus Westen), Ost = Bahnrichtung 07 (Anflug aus Osten, also Gegenwind aus Osten).
- **Rückenwind (Tailwind):** Windanteil in Flugrichtung beim Landen. Westbetrieb mit starkem Wind aus Ost bedeutet Rückenwind, deshalb wird dann auf Ost gewechselt.
- **Ensemble:** Viele leicht unterschiedlich gestartete Wettersimulationen (Mitglieder, Members). Der Anteil der Mitglieder mit Ostlage ist die Ostwahrscheinlichkeit.
- **Vorlaufzeit (Lead Time):** Abstand zwischen Berechnungszeitpunkt und Beginn des Zeitfensters.
- **Klimatologie:** Langjähriger Mittelwert, hier der historische Ostanteil je Monat und Zeitfenster.
- **Persistenz:** Annahme "es bleibt, wie es gerade ist".

## 2. Arbeitsweise und Rahmenbedingungen

- **API-First, Schema-First.** JSON Schemas liegen in der bestehenden API und sind die einzige Quelle der Wahrheit. Alles andere wird daraus erzeugt und nie von Hand gepflegt: MySQL-DDL (Migrationen), TypeScript-Typen, Pydantic-Modelle, Validierung.
- **Stack:** Frontend Vue 3 (TypeScript, strict) mit Vite, shadcn-vue, Tailwind CSS v4 und Lucide-Icons (Details in Abschnitt 10), Backend/Jobs Python, Speicherung MySQL über die bestehende hauseigene API. **Kein Astro.**
- **Zuerst die bestehende API sichten:** Wo liegen Schemas, wie werden Tabellen und Migrationen bisher angelegt, wie wird validiert, wie sind Auth und Fehlerformat gelöst. Vorhandenen Konventionen folgen. Bei echten Lücken oder Widersprüchen nachfragen statt raten. Ein erster Teil ist erledigt (2a), der Rest bleibt Aufgabe von Phase 0.
- Keine Kommentare im Code. Das gilt auch für YAML, Dockerfiles, nginx-Konfiguration, CSS und SQL. Dokumentation gehört nach `docs/`.
- Texte und Dokumentation ohne Gedankenstriche, stattdessen Kommas oder Bindestriche. Das gilt auch für alle sichtbaren Oberflächentexte und Fehlermeldungen.
- Commits nach Conventional Commits, kurz, eine Zeile (siehe 11e). Im API-Repo gelten zusätzlich die Regeln aus dessen `AGENTS.md` (2a).
- Wo diese Anweisung und ein Skill sich widersprechen, gilt diese Anweisung. Bekannte Fälle: Der Website-Workflow verlangt einen Kommentarblock mit der Utility-Übersicht in `global.css` (hier nicht erlaubt, Übersicht nach `docs/frontend.md`) und rät bei Dashboards von shadcn-Defaults ab (hier ist shadcn-vue ausdrücklich gewünscht, wird aber auf die Tokens dieses Projekts gemappt, siehe 10a).

### 2a. Bestandsaufnahme der bestehenden API (Stand 2026-10-16, Schnellsichtung)

Gesichtet in `/Users/tobe/Sites/tobeworks_projects/api`:

- Flask-Anwendung, Einstieg `server.py`, ein Modul pro Themenbereich unter `api/` (`api_leads.py`, `api_interview.py` und weitere), Datenbankzugriff über `api/mysql_config.py`, Rate-Limit-Modul `api/api_rate_limit.py`, Tests unter `tests/`.
- CORS wird in `server.py` pro Routenpräfix mit einer Liste erlaubter Ursprünge gesteuert. Eine neue Domain muss dort eingetragen werden.
- Migrationen sind **handgeschriebene `.sql`-Dateien** in `migrations/` (`create_*.sql`, `add_*.sql`, `seed_*.sql`), ohne erkennbare Nummerierung. Ob es eine Tabelle zur Nachverfolgung angewendeter Migrationen gibt, ist offen.
- `schemas/` enthält genau **ein** Schema (`interview.schema.json`, Draft 2020-12, deutschsprachige Beschreibungen, `additionalProperties: false`). Dessen Quelle liegt in einem anderen Repo, die API hält eine Kopie, ein Test (`tests/test_interview_schema_sync.py`) schlägt bei Abweichung an und wird übersprungen, wenn die Quelle nicht daneben liegt. Dieses Muster wird für die Typ-Spiegelung übernommen (7b).
- `AGENTS.md` im API-Repo: Conventional Commits, eine Zeile, kein `Co-Authored-By`-Footer, und **niemals `git push` oder Deploy ohne ausdrückliche Erlaubnis im jeweiligen Moment**, es ist eine produktive API. Diese Regel gilt auch für alle Änderungen dieses Projekts an der API.
- Ein DDL-Generator, ein TypeScript- oder Pydantic-Generator und eine Validierung gegen die Schemas **existieren nicht** und sind Teil dieses Projekts.

Noch zu klären (Phase 0, vor dem Schreiben von Code): Authentifizierungsmuster (Token, Basic, Session), Fehlerformat, Paginierung, Rate-Limit-Nutzung, DB-Verbindungsmuster und Transaktionen, Logging, wie `tests/` mit der Datenbank umgehen. Nachsehen in `api_leads.py`, `api_interview.py`, `api_rate_limit.py`, `login.py`, `handpan_auth.py`, `mysql_config.py`.

### 2b. Repository-Aufteilung

| Ort | Inhalt |
|---|---|
| API-Repo (`api`) | Schemas (Quelle), Generatoren, Migrationen, Blueprint `api_betriebsrichtung.py`, Tests der API |
| Dieses Repo (`betriebsrichtung`) | `frontend/` (Vue-App), `jobs/` (Python-Jobs), `docs/`, CI, Dockerfiles |
| Netcup-Repo (`argo/netcup`) | Kubernetes-Manifeste, ArgoCD-Apps, Image-Updater-CRs |

Gemeinsame Typen: Die generierten TypeScript-Typen und Pydantic-Modelle werden aus dem API-Repo erzeugt und in dieses Repo gespiegelt (7b). Das Spiegelverzeichnis ist generierter Code, wird nie von Hand bearbeitet und steht in der CI unter Abweichungsprüfung.

## 3. Datenquellen

Alle Angaben zu externen Schnittstellen vor der Nutzung gegen die aktuelle Doku prüfen, sie stammen aus dem Gedächtnis. Jede Quelle bekommt in `docs/datenquellen.md` einen Steckbrief (URL, Format, Limits, Lizenz, Stabilität, Testabruf, Entscheidung).

1. **Ensemble-Winddaten:** Open-Meteo Ensemble API (https://open-meteo.com). Parameter: Windrichtung und Windgeschwindigkeit in 10 m, stündlich, für die Koordinaten des Flughafens (ca. 50.04 N, 8.56 E). Mehrere Modelle und jeweils alle Ensemble-Läufe abrufen.
   - Zu prüfende Modellkandidaten (Namen, Mitgliederzahl, Horizont vorher gegen die Doku verifizieren): ICON (global, EU, D2), GFS (Ensemble, 30 Mitglieder plus Kontrolllauf, Horizont 10 Tage, laut Phase-0-Prüfung korrigiert), ECMWF IFS (ca. 50 Mitglieder plus Kontrolllauf, Horizont bis ca. 15 Tage), GEM global ensemble, optional UKMO und BOM.
   - Wichtig für 14 Tage: ICON-D2 und ICON-EU reichen nur wenige Tage, ICON global etwa eine Woche. Jenseits davon tragen nur GFS, ECMWF und GEM. Beim Wegfall von Modellen ändert sich die Mitgliederzahl, die Wahrscheinlichkeit kann dadurch springen. Gegenmittel: Modellgewichte statt gepoolter Mitglieder (4c) und Glättung der Übergänge.
   - Parameter, die zu prüfen sind: `models`, `hourly=wind_speed_10m,wind_direction_10m`, Einheit `wind_speed_unit=kn` (Knoten, damit Schwellen direkt lesbar sind), `timezone=UTC`, `forecast_days`, Benennung der Mitgliedsspalten (`..._member01` und so weiter, Kontrolllauf ohne Suffix). Optional `wind_gusts_10m` und `wind_speed_100m` als Zusatzmerkmale.
   - Nutzungsbedingungen: Die freie Nutzung ist laut Doku für nicht-kommerzielle Zwecke gedacht, mit Namensnennung (CC BY 4.0) und Abrufgrenzen pro Minute, Stunde und Tag. Kommerzielle Nutzung verlangt ein Abo mit API-Key. Einordnen, ob eine öffentliche App unter dem Tobeworks-Namen als kommerziell gilt. Die gewichteten Abrufe (Variablen mal Tage mal Modelle) einplanen, ein Lauf pro Modell hält die Anfragen klein.
2. **Aktuelle Betriebsrichtung:** Umwelthaus (https://www.umwelthaus.org/fluglaerm/anwendungen-service/aktuelle-betriebsrichtung-und-prognose/) und/oder Fraport. Prüfen, ob es eine maschinenlesbare Schnittstelle gibt (Netzwerk-Tab der Seite, eingebettetes JSON, Widget-Endpunkt). Scraping nur, wenn die Nutzungsbedingungen es zulassen, sonst Alternative vorschlagen oder beim Betreiber um Erlaubnis bitten. Weitere Kandidaten für die aktuelle Richtung:
   - D-ATIS des Flughafens (EDDF): Das ATIS nennt die Bahnen in Betrieb ("Landing runway ..."). Inoffizielle Aggregatoren existieren, ihre Stabilität und Lizenz prüfen.
   - Eigene Ableitung aus ADS-B (siehe 4).
3. **Historische Betriebsrichtung:** Prüfen, ob Fraport, DFS oder Umwelthaus Archive oder Berichte in maschinenlesbarer Form bieten (Fraport-Verkehrszahlen, Fluglärmberichte, Anfragen nach dem Umweltinformationsgesetz). Auch die Datenlage der Fluglärm-Messstellen und der Landesbehörde (HLNUG) einbeziehen.
4. **Fallback für Rückwärtsrekonstruktion:** Offene ADS-B-Daten (z. B. OpenSky, adsb.lol, airplanes.live) liefern Landungen, daraus wird die genutzte Richtung abgeleitet. Vorgehen: Landungen im Umkreis ca. 15 km um die Bahnen mit Landeanflug-Kurs um 070 Grad (Ost) oder 250 Grad (West), je Zeitfenster Mehrheitsentscheid. Grenzen: Historische Abfragen sind bei einigen Anbietern auf registrierte Konten und Tagesbudgets beschränkt, die Abdeckung nachts ist dünn (Nachtflugverbot, wenige Bewegungen), dann ist das Ergebnis "keine Daten", **niemals** "West". Nur umsetzen, wenn 2 und 3 nichts liefern.
5. **Windbeobachtung am Flughafen (neu, für Kalibrierung und bessere Notlösung):**
   - METAR/SPECI der Station EDDF. Aktuell über die Dienste der Wetterdatenanbieter (z. B. Aviation Weather Center), historisch über das Archiv des Iowa Environmental Mesonet (ASOS/METAR-Download, mit Rückblick über Jahre). Liefert Windrichtung und Stärke am Flughafen, in der Praxis die beste Messgröße für die Betriebsentscheidung.
   - DWD-Station Frankfurt/Main Flughafen über die offenen DWD-Daten oder einen Wrapper wie Bright Sky, als Gegenprobe.
6. **Grobe Notlösung für Statistik:** Betriebsrichtung aus Wind schätzen. Bevorzugt aus gemessenem METAR-Wind (Punkt 5) mit der Regel aus Abschnitt 4, ersatzweise aus Open-Meteo Historical (Reanalyse ERA5, Archiv-Endpunkt). Muss in den Daten klar als geschätzt gekennzeichnet sein (eigene Quelle `wind_estimate`, bei Reanalyse zusätzlich Unterquelle im Feld `detail`), niemals als echte Beobachtung.
7. **Prognose-Referenz (optional):** Die Umwelthaus-Prognose für die ersten Tage als Vergleichsreihe speichern, sofern erlaubt (Entität `ExternalForecast`, wird nicht ausgeliefert, nur für Qualitätsvergleich).

Bewertungsmatrix für `docs/datenquellen.md`:

| Kriterium | Frage |
|---|---|
| Maschinenlesbar | Stabile Schnittstelle oder nur HTML? |
| Erlaubnis | Nutzungsbedingungen erlauben automatisierten Abruf und Speicherung? |
| Auflösung | Wechselzeitpunkt, Stunde, Slot, Tag? |
| Rückblick | Ab wann, lückenlos? |
| Aktualität | Verzögerung zwischen Ereignis und Verfügbarkeit? |
| Stabilität | Wie wahrscheinlich bricht das Format? |
| Aufwand | Tage bis zum ersten Datensatz |

Ergebnis dieser Recherche ist ein kurzes Dokument, welche Quelle für Beobachtungen und Historie genutzt wird, bevor Jobs gebaut werden. Entscheidungsregel: Echte Beobachtung vor Ableitung aus Flugdaten vor Windschätzung, jede Stufe wird nur genutzt, wenn die höhere nichts liefert, und im Datensatz bleibt die Stufe sichtbar.

## 4. Fachliche Logik der Prognose

Alle Zahlen sind Startwerte, sie werden durch Kalibrierung angepasst und stehen in der Konfiguration (4e).

### 4a. Definitionen

1. **Bahnachse** der Parallelbahnen: 070 und 250 Grad. Ostbetrieb landet in Richtung 070, Westbetrieb in Richtung 250.
2. **Rückenwind bei Westbetrieb** (Wind kommt aus Richtung `d`, Geschwindigkeit `v`, Landung Richtung 250): `tailwind_west = v * cos(d - 70)`. Positive Werte bedeuten Wind aus Ost, also Rückenwind für die Landung auf 25. Umgekehrt ist `tailwind_east = -tailwind_west`. Die Querkomponente ist wegen der Parallelbahnen nachrangig und wird nur als Zusatzmerkmal erfasst.
3. **Wahrheit pro Zeitfenster:** Für jedes Fenster wird aus den Beobachtungen der Zeitanteil mit Ostbetrieb berechnet (`east_share`, 0 bis 1). Das Fenster zählt als **Ost**, wenn `east_share > 0,5`, sonst **West**. Das Prognoseziel ist das binäre Ereignis "Fenster ist Ost". Zusätzlich wird der erwartete Anteil `expected_east_share` mitgeführt, er ist für die Farbintensität im Frontend nützlich. Beide Größen werden in `SlotActual` abgelegt (Abschnitt 6).
4. **Lücken:** Zeitanteile ohne Beobachtung zählen weder als West noch als Ost. Ist weniger als 70 Prozent des Fensters abgedeckt, ist das Fenster `gap` und fließt in keine Statistik und keine Bewertung ein.
5. **Nacht:** Im Zeitfenster `night` gibt es wenige Bewegungen. Die Richtung ist dennoch definiert (ATIS, Beobachtung der Quelle). Bei Ableitung aus ADS-B ist `night` häufig `gap`. Die Bewertung weist `night` getrennt aus, damit wenige Datenpunkte die anderen Fenster nicht verzerren.
6. **Zeitumstellung:** Fensterzuordnung geschieht ausschließlich im Backend mit `zoneinfo("Europe/Berlin")`, an Umstelltagen hat ein Tag 23 oder 25 Stunden, das Fenster `night` dauert dann 7 oder 9 Stunden. Alle Zeiten werden als UTC gespeichert und geliefert. Das Frontend zeigt nur an. Konkrete Testdaten: 2026-03-29, 2026-10-25, 2027-03-28, 2027-10-31.

### 4b. Entscheidungsmodell Wind zu Betriebsrichtung

Zustandsautomat pro Ensemble-Mitglied, stündlich:

1. Wind glätten: gleitendes Mittel der Rückenwindkomponente über `smoothing_hours` (Startwert 3). Die Komponente ist linear in den Windvektor, deshalb ist Mitteln der **Komponente** korrekt. **Windrichtungen werden nie arithmetisch gemittelt**, für Mittelwert und Streuung der Richtung dienen Vektorkomponenten (u, v) beziehungsweise die mittlere Resultierende (zirkuläre Statistik).
2. Zustand West: Wechsel zu Ost, wenn `tailwind_west > east_on_tailwind_kn` (Startwert 5 Knoten).
3. Zustand Ost: Rückwechsel zu West, wenn `tailwind_west < west_back_tailwind_kn` (Startwert 0 bis 3 Knoten, **Hysterese**). Ein Rückwechsel nach West ist in der Praxis der Normalfall, sobald der Rückenwind für West verschwindet.
4. Mindestverweildauer `min_dwell_hours` (Startwert 2 bis 3 Stunden), damit kurze Böen oder Winddrehungen nicht zu Flackern führen.
5. **Anfangszustand:** Der Automat startet beim Berechnungszeitpunkt mit der **aktuell beobachteten** Betriebsrichtung. Das macht die ersten Stunden und den ersten Tag deutlich besser (Persistenz) und ist auch für die Qualität in 1 bis 2 Tagen Vorlauf relevant.
6. Pro Mitglied und Zeitfenster: `east_share_member` = Anteil der Stunden mit Ost. Mitglied zählt als Ost, wenn `east_share_member > 0,5`.

Weitere Einflussgrößen, die nicht im Wind stecken und als bekannte Fehlerquelle dokumentiert werden: Gewitter, tiefe Wolken und Sichtbedingungen, Bauarbeiten und Bahnsperrungen, Lärmpausen und Nachtregelungen, Sonderfälle der Flugsicherung. Sie werden nicht modelliert, sondern in der Methodik erwähnt und über die Kalibrierung implizit mitgetragen.

### 4c. Wahrscheinlichkeit

1. Pro Modell: `p_model = Anteil der Mitglieder mit Ost` (Kontrolllauf zählt als Mitglied).
2. Gesamt: gewichteter Mittelwert `p = sum(w_m * p_model) / sum(w_m)` über die Modelle, die für das Zeitfenster Daten haben. Gewichte konfigurierbar, nach Vorlaufzeit gestaffelt (kurzer Horizont: hochaufgelöste Modelle stärker, langer Horizont: ECMWF und GFS).
3. **Ensembles sind oft zu selbstsicher** (zu wenig Streuung). Deshalb wird `p` nicht roh ausgeliefert, sondern kalibriert (4d). Die ausgelieferte Zahl ist immer die kalibrierte, die rohe wird mitgespeichert.
4. Begrenzung auf `[0,02 ; 0,98]` und Anzeige als "unter 5 %" beziehungsweise "über 95 %", niemals "0 %" oder "100 %". Rundung der Anzeige auf 5 Prozentpunkte.
5. Übergänge zwischen Modellmengen (Horizonte) werden über stetige Gewichtsrampen statt harter Schnitte geführt, damit sich `p` zwischen zwei Tagen nicht sprunghaft ändert.
6. Mittlere Windrichtung, Windstärke und Streuung je Fenster werden aus den Mitgliedern berechnet (zirkuläre Statistik) und als `WindAggregate` gespeichert.

### 4d. Kalibrierung in zwei Stufen

Hintergrund: Echte Ensemble-Archive vergangener Prognosen existieren am Anfang nicht, sie entstehen erst, wenn der Forecast-Job läuft. Deshalb zwei getrennte Aufgaben:

- **Stufe 1, Entscheidungsmodell (sofort möglich):** Parameter aus 4b (Schwellen, Hysterese, Verweildauer, Glättung) anhand **beobachteter Winddaten (METAR/DWD, ersatzweise Reanalyse) gegen die beobachtete Betriebsrichtung** anpassen. Zielgröße: Trefferquote und Brier-Score je Fenster. Verfahren: Rastersuche über wenige Parameter oder logistische Regression der Rückenwindkomponente, zeitlich getrennte Validierung (Rolling Origin, **kein zufälliges k-Fold**, wegen zeitlicher Abhängigkeit). Wenige Parameter, damit keine Überanpassung entsteht.
- **Stufe 2, Wahrscheinlichkeitskalibrierung (nach einigen Wochen):** Rohe Ensemble-Wahrscheinlichkeit zu kalibrierter Wahrscheinlichkeit abbilden, getrennt nach Vorlaufklasse (logistische Regression, Platt-Skalierung, oder isotone Regression bei genug Daten). Erst ab einer Mindestzahl an Vergleichen je Vorlaufklasse (Startwert 150) aktivieren, davor wird die Rohwahrscheinlichkeit mit klarem Hinweis ausgeliefert. Saisonalität (Winter und Frühjahr gegenüber Sommer) beachten, nach einem Jahr Daten saisonale Terme prüfen.
- Prüfen, ob Open-Meteo vergangene Ensemble-Läufe (Historical Forecast oder Previous Runs) bereitstellt. Falls ja, kann Stufe 2 früher mit einem Nachlauf (Hindcast) begonnen werden, ansonsten gilt das Obige.
- Jede Parameteränderung erzeugt eine neue `ForecastConfig` mit neuer Versionsnummer. Alte Prognosen behalten ihre Version, damit Auswertungen nach Version möglich sind.

### 4e. Konfiguration

Alle Parameter in einer Datei `jobs/config/forecast.json`, geprüft gegen ein eigenes Schema `forecast_config.schema.json` (schema-first, 5). Ein Hash der Datei wird als Konfigurationsversion in jedem `ForecastRun` gespeichert. Inhalt:

```json
{
  "schema": 1,
  "version": 1,
  "airport": { "icao": "EDDF", "latitude": 50.04, "longitude": 8.56 },
  "axis": { "east_landing_deg": 70, "west_landing_deg": 250 },
  "decision": {
    "east_on_tailwind_kn": 5,
    "west_back_tailwind_kn": 2,
    "smoothing_hours": 3,
    "min_dwell_hours": 2,
    "slot_majority": 0.5
  },
  "models": [
    { "id": "ecmwf_ifs025", "weights": { "d0_2": 1.0, "d3_7": 1.0, "d8_14": 1.0 } },
    { "id": "gfs025", "weights": { "d0_2": 0.7, "d3_7": 0.8, "d8_14": 1.0 } },
    { "id": "icon_global", "weights": { "d0_2": 1.0, "d3_7": 0.8, "d8_14": 0.0 } }
  ],
  "calibration": { "method": "none", "min_samples": 150 },
  "limits": { "probability_min": 0.02, "probability_max": 0.98 }
}
```

Die Modell-IDs sind Platzhalter bis zur Prüfung gegen die Open-Meteo-Doku.

### 4f. Baselines und Gütemaße

Immer gegen mehrere Referenzen messen, nicht nur "immer West":

1. **Immer West** (Baseline aus dem Auftrag).
2. **Klimatologie:** Historischer Ostanteil je Monat und Zeitfenster (ab genügend Historie).
3. **Persistenz:** Aktuelle Richtung bleibt (stark in den ersten Stunden bis zu einem Tag).
4. **Umwelthaus-Prognose** (falls verfügbar), für die ersten Tage.

Maße je Vorlaufklasse und Fenster:

- **Brier-Score** und **Brier Skill Score** gegen jede Baseline (positiv = besser als die Baseline). Das ist die Hauptkennzahl.
- **Trefferquote** bei Schwelle 0,5, weil sie intuitiv ist. Mit Hinweis, dass "immer West" bei einer Ostquote von ca. 27 Prozent bereits eine hohe Trefferquote hat.
- **Reliability-Diagramm:** Vorhergesagte Wahrscheinlichkeit (Klassen von 10 Prozent) gegen tatsächliche Häufigkeit. Zeigt, ob "70 %" wirklich 70 Prozent bedeutet.
- **Konfidenzintervalle** per Bootstrap (Blöcke über ganze Tage, wegen Abhängigkeit). Zahlen unter 30 Vergleichen werden nicht als Kennzahl angezeigt.
- Vorlaufklassen: Rohwerte je Vorlauftag 1 bis 14 (für die Unsicherheitsgrenze), aggregiert in "bis 1 Tag", "2 bis 3 Tage", "4 bis 7 Tage", "8 bis 14 Tage". Die im Auftrag genannten Klassen 1, 3, 7, 14 Tage bleiben als Beschriftung der oberen Grenzen erhalten. Vorlaufzeit wird ab Fensterbeginn gerechnet.
- Zeitfenster: gleitend 90 Tage und gesamt.
- **Unsicherheitsgrenze (`skill_horizon_days`):** Erster Vorlauftag, an dem der Skill Score gegenüber der Klimatologie nicht mehr belastbar über null liegt. Diese Zahl steuert den Trenner im Frontend. Solange zu wenige Daten vorliegen, wird ein fester Standardwert (7 Tage) mit dem Hinweis "vorläufig" verwendet.

## 5. Schema-Regeln

- JSON Schema Draft 2020-12, ein File pro Entität, gemeinsame Bausteine über `$defs` und `$ref` (Zeitstempel, Wahrscheinlichkeit 0 bis 1, Betriebsrichtung, Slot, Quelle, Statuswert).
- Enums, Wertebereiche und `maxLength` direkt im Schema.
- `additionalProperties: false`.
- Schema-Versionsnummer pro Datei (Muster wie im vorhandenen `interview.schema.json`: Feld `schema` mit `const`).
- Zeiten in UTC (ISO 8601), Umrechnung nach Europe/Berlin nur im Frontend zur Anzeige und im Backend bei der Zuordnung zu Zeitfenstern. Zeitumstellung (letzter Sonntag im März und Oktober) muss korrekt behandelt werden, Tests dafür anlegen.
- DB-Informationen, die JSON Schema nicht abbildet, über ein eigenes Keyword `x-db` (Tabellenname, Primärschlüssel, Spaltentyp, Indizes, Unique-Constraints, Fremdschlüssel). Unbekannte Keywords sind in 2020-12 zulässig, der Validator muss sie ignorieren.
- `title` und `description` auf Deutsch, wie im vorhandenen Schema. Beschreibungen erklären auch Regeln, die ein Schema nicht ausdrücken kann (zum Beispiel "Ende größer als Beginn").
- `format: date-time` wird nur geprüft, wenn der Validator mit Format-Prüfung läuft. Das gehört in die Validierungsfunktion und in einen Test.
- Wahrscheinlichkeiten als `number` mit `minimum: 0`, `maximum: 1`. In der DB `DECIMAL(5,4)`. Statistikwerte `DOUBLE`.
- Gemeinsame `$defs` in `common.schema.json` (Datei, nicht Entität), `$ref` relativ.
- Zusätzlich ein Schema für die Konfiguration (4e) und eines für die Fehlerantwort.

Beispiel für den Aufbau einer Entität:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "observation.schema.json",
  "type": "object",
  "x-db": {
    "table": "observation",
    "primaryKey": ["id"],
    "indexes": [{ "name": "idx_observed_at", "columns": ["observed_at"] }],
    "unique": [{ "name": "uq_observation", "columns": ["observed_at", "source"] }]
  },
  "properties": {
    "id": { "type": "integer", "x-db": { "type": "BIGINT UNSIGNED", "autoIncrement": true } },
    "observed_at": { "type": "string", "format": "date-time", "x-db": { "type": "DATETIME(3)" } },
    "runway_direction": { "enum": ["east", "west"] },
    "source": { "type": "string", "maxLength": 32 },
    "recorded_at": { "type": "string", "format": "date-time", "x-db": { "type": "DATETIME(3)" } }
  },
  "required": ["observed_at", "runway_direction", "source", "recorded_at"],
  "additionalProperties": false
}
```

## 6. Entitäten

1. **Observation:** Zeitpunkt, Betriebsrichtung (`east`, `west`), Quelle (Enum, u. a. `umwelthaus`, `fraport`, `datis`, `adsb`, `wind_estimate`), Erfassungszeitpunkt, optional `detail` (z. B. Unterquelle bei `wind_estimate`). Nur bei Wechsel speichern, zusätzlich regelmäßiger Heartbeat, damit Lücken von "unverändert" unterscheidbar sind. Heartbeat als eigene Zeile mit Typ `heartbeat` oder als getrennte Tabelle `source_heartbeat` (Entscheidung bei der Schemaarbeit, Empfehlung: getrennte Tabelle, hält `observation` schlank).
2. **ForecastRun:** Berechnungszeitpunkt, Konfigurationsversion (Hash), je Modell der Initialisierungszeitpunkt des Modelllaufs, Status (`ok`, `partial`, `failed`), Anzahl Mitglieder je Modell, Dauer. Dient als Idempotenzanker und Rückverfolgung.
3. **Forecast:** Verweis auf `ForecastRun`, Ziel-Zeitfenster (Start, Ende, Slot, lokales Datum), Modell (`blend` oder Einzelmodell), rohe und kalibrierte Ostwahrscheinlichkeit, erwarteter Ostanteil, Anzahl Ensemble-Läufe, Vorlaufzeit in Stunden, Konfigurationsversion. Jede Berechnung als neue Zeile, niemals überschreiben, sonst ist keine Auswertung nach Vorlaufzeit möglich. Eindeutigkeit über (Lauf, Fensterbeginn, Modell).
4. **WindAggregate:** Zeitfenster, Modell, Verweis auf `ForecastRun`, Anteil Läufe mit Ostlage, mittlere Windrichtung (zirkulär) und Windstärke, Streuung (mittlere Resultierende, Standardabweichung der Stärke, Quantile P10/P50/P90 der Rückenwindkomponente). Optional, erlaubt Neuberechnung ohne erneute Abfrage der Wetter-API. Für vollständige Neuberechnung zusätzlich optional die **Rohdaten der Mitglieder** als komprimierte Datei (nicht in MySQL, siehe 9).
5. **SlotActual:** Lokales Datum, Slot, Beginn, Ende, `east_share`, `observed_share` (Abdeckung), Wahrheit (`east`, `west`, `gap`), maßgebliche Quelle, höchste Qualitätsstufe der beteiligten Quellen (`observed`, `estimated`). Wird aus `Observation` abgeleitet (Job oder Ansicht), damit Frontend und Auswertung dieselbe Wahrheit nutzen. Neuberechnung bei nachgetragenen Daten (Backfill) erlaubt, deshalb mit `computed_at`.
6. **ForecastEvaluation:** Vorlaufklasse (und optional Vorlauftag), Zeitfenster-Art (`morning`, `afternoon`, `night`, `all`), Zeitraum (Fenster, z. B. gesamt oder 90 Tage), Konfigurationsversion, Anzahl Vergleiche, Trefferquote, Brier-Score, Skill Score je Baseline (West, Klimatologie, Persistenz), Konfidenzintervall, Reliability-Klassen (als Kindzeilen oder JSON), Vergleich zur Baseline.
7. **ForecastConfig:** Version, Hash, Inhalt (JSON), Erstellzeitpunkt, Beschreibung der Änderung. Fremdschlüsselziel für Konfigurationsversionen.
8. **JobRun:** Jobname, Beginn, Ende, Status, Zähler (gelesene, geschriebene Zeilen), Fehlertext, Version des Jobs. Grundlage der Statusseite (Abschnitt 13).
9. **ExternalForecast (optional):** Quelle (z. B. Umwelthaus), Abrufzeitpunkt, Zielfenster, Aussage (Richtung oder Wahrscheinlichkeit), nur zur Qualitätsmessung.
10. **Stats-Responses:** Ostanteil pro Woche, Monat und Jahr, Anzahl Tage mit Ostbetrieb, längste Ostphase am Stück, Abweichung zum Jahresmittel, saisonaler Verlauf, Tageszeitprofil (Ostanteil je Zeitfenster), Anzahl Richtungswechsel. Jede Statistik benennt die Datenbasis (Anteil echter gegenüber geschätzter Daten).
11. **API-Envelopes:** Listen mit Zeitraum und Paginierung, einheitliches Fehlerformat, Response-Metadaten (`generated_at`, `data_through`, `schema`).

Mengenabschätzung (Orientierung): Bei 14 Tagen, 3 Fenstern, ca. 5 Modellzeilen und 3 Läufen pro Tag entstehen rund 600 Forecast-Zeilen pro Tag, also rund 230 000 pro Jahr. `Observation` wächst mit den Richtungswechseln, nur wenige Zeilen am Tag. MySQL ist dafür ausreichend, nötige Indizes: (Fensterbeginn, Modell, Berechnungszeitpunkt) für "neueste Berechnung pro Fenster".

## 7. Generatoren und Qualitätssicherung

### 7a. DDL-Generator

Erzeugt versionierte Migrationen aus Schema und aktuellem Datenbankstand, inklusive sauberer `ALTER TABLE`-Fälle (neue Spalten, Typänderungen, Indizes). Nur Vorschläge und Dateien erzeugen, nie automatisch Daten verändern, nie selbst gegen die produktive Datenbank ausführen. Destruktive Änderungen (Spalte löschen, Typ verkleinern) nur mit ausdrücklicher Bestätigung.

- Ausgabe im vorhandenen Stil: `.sql`-Dateien in `migrations/` des API-Repos. Ergänzend einführen: Präfix mit Datum und laufender Nummer (`2026-10-20_01_create_betriebsrichtung.sql`) und eine Tabelle `schema_migrations` mit Dateiname und Prüfsumme, falls sie nicht bereits existiert (in Phase 0 klären).
- Standard für MySQL: InnoDB, `utf8mb4`, `DATETIME(3)` für UTC-Zeiten, Fremdschlüssel nur wo sie Nutzen bringen, Unique-Keys für Idempotenz.
- Der Generator vergleicht den Sollzustand (Schema) mit dem Ist-Zustand (Introspektion über `information_schema` einer Entwicklungs- oder Kopie-Datenbank) und erzeugt nur die Differenz. Trockenlauf mit Ausgabe ist der Standard.
- Vor jeder Migration auf Produktion: Datenbanksicherung, Freigabe durch den Auftraggeber im jeweiligen Moment (Regel aus 2a).

### 7b. Typen und Modelle

1. **TypeScript-Typen** aus den Schemas (z. B. `json-schema-to-typescript`), im Frontend als gemeinsames Verzeichnis `frontend/src/api/generated/`.
2. **Pydantic-Modelle** aus den Schemas (z. B. `datamodel-code-generator`) für das Python-Backend und die Jobs (`jobs/…/generated/`). Version 2 von Pydantic.
3. **Spiegelung:** Quelle ist das API-Repo (`schemas/betriebsrichtung/`). Dieses Repo hält erzeugte Dateien, ein Skript erzeugt sie aus einem Pfad (`SCHEMA_DIR`, Standard `../api/schemas/betriebsrichtung`). Wie bei `test_interview_schema_sync.py` gilt: Liegt die Quelle nicht daneben, wird der Abgleich übersprungen, in der CI wird das API-Repo ausgecheckt (Zugriffstoken für das private Repo nötig).
4. Generierte Dateien enthalten kein von Hand pflegbares Wissen und werden nicht durch Linting verändert (Ausschlussliste).

### 7c. Validierung

- Validierung in der API gegen dieselben Schemas für Requests und Responses (Bibliothek `jsonschema` mit Format-Prüfung). Antwortvalidierung läuft in Tests und in einem Entwicklungsmodus, in Produktion nur bei Verdacht (Leistung).
- Zusätzliche Regeln, die das Schema nicht ausdrückt, stehen in der Schema-Beschreibung und im Code: Ende nach Beginn, Fenstergrenzen passen zum Slot, Wahrscheinlichkeiten je Fenster konsistent.

### 7d. CI und Tests

1. **CI-Check:** Schlägt fehl, wenn generierte Dateien oder Migrationen vom Schema abweichen (Generator erneut laufen lassen, `git diff --exit-code`).
2. Tests mit Beispieldaten pro Schema (gültig und ungültig), Test für Zeitumstellung (4a, Testdaten), Test für Idempotenz der Jobs.
3. Weitere Tests siehe Abschnitt 14.

## 8. API-Endpunkte (in der bestehenden API)

Neues Modul `api/api_betriebsrichtung.py` mit Resource-Klassen (kein Blueprint, so sind die bestehenden Module gebaut), registriert in `server.py` unter dem Präfix `/betriebsrichtung/v1`. Details in `docs/api-konventionen.md`. CORS-Eintrag für die Frontend-Domains in `server.py`. Authentifizierung, Fehlerformat und Pagination nach bestehender Konvention der API (Phase 0).

**Schreiben (nur Jobs, Token-geschützt, idempotent):**

| Methode und Pfad | Zweck |
|---|---|
| `POST /ingest/observations` | Batch von Observations, idempotent über Unique-Key |
| `POST /ingest/heartbeats` | Heartbeats der Quellen |
| `POST /ingest/forecast-runs` | Lauf mit Forecasts und WindAggregates in einer Transaktion (alles oder nichts) |
| `POST /ingest/evaluations` | Auswertungen |
| `POST /ingest/job-runs` | Laufprotokoll |

Der Forecast-Lauf wird bewusst atomar geschrieben, damit nie ein halber Lauf lesbar ist.

**Lesen (öffentlich lesbar oder hinter Zugang, siehe offene Punkte):**

| Methode und Pfad | Zweck |
|---|---|
| `GET /current` | Aktuelle Betriebsrichtung, seit wann, Quelle, Alter der Daten |
| `GET /timeline?from=&to=` | **Vorberechnete Zeitachse:** pro Tag und Fenster entweder Wahrheit (`observed`, `estimated`, `gap`) oder die neueste Prognose (`forecast`). Spart dem Frontend das Zusammenführen und stellt sicher, dass es genau eine Implementierung der Fensterlogik gibt |
| `GET /slots/{date}/{slot}` | Detail: Prognose, Wind-Aggregate, Streuung, beteiligte Modelle, **Verlauf der Prognose über die Berechnungen** (wie hat sich die Zahl für dieses Fenster geändert) |
| `GET /observations?from=&to=&source=` | Rohdaten, paginiert |
| `GET /forecasts?from=&to=&latest=true` | Forecasts für Zeitraum (neueste Berechnung pro Zeitfenster, mit `latest=false` alle Berechnungen) |
| `GET /stats?granularity=week\|month\|year&from=&to=` | Statistik inklusive Datenbasis |
| `GET /evaluation?window=90d\|all` | Prognosegüte nach Vorlaufzeit, Baselines, Reliability, `skill_horizon_days` |
| `GET /status` | Frische der Quellen, letzte Jobläufe, Konfigurationsversion, Schemaversion |
| `GET /healthz` | Einfache Lebendprüfung für Kubernetes |

Beispielantwort `GET /timeline` (verkürzt):

```json
{
  "schema": 1,
  "generated_at": "2026-10-16T18:05:00.000Z",
  "data_through": "2026-10-16T18:00:00.000Z",
  "timezone": "Europe/Berlin",
  "skill_horizon_days": 7,
  "skill_horizon_provisional": true,
  "items": [
    {
      "local_date": "2026-10-15",
      "slot": "afternoon",
      "start": "2026-10-15T12:00:00.000Z",
      "end": "2026-10-15T20:00:00.000Z",
      "status": "observed",
      "runway_direction": "west",
      "east_share": 0.0,
      "source": "umwelthaus"
    },
    {
      "local_date": "2026-10-18",
      "slot": "morning",
      "start": "2026-10-18T04:00:00.000Z",
      "end": "2026-10-18T12:00:00.000Z",
      "status": "forecast",
      "p_east": 0.62,
      "p_east_raw": 0.71,
      "lead_hours": 58,
      "computed_at": "2026-10-16T05:40:00.000Z",
      "members": 142,
      "calibrated": false
    }
  ]
}
```

Querschnittsthemen:

- **Caching:** `ETag` und `Cache-Control` mit kurzer Lebensdauer (z. B. 5 Minuten für `current` und `timeline`, länger für `stats` und `evaluation`), `stale-while-revalidate` erlaubt. Neue Prognosen erscheinen höchstens dreimal täglich, aktuelle Beobachtung alle paar Minuten.
- **Rate-Limit:** über `api_rate_limit.py`, großzügig für Lesen, strikt für Schreiben.
- **Fehler:** Einheitlich, maschinenlesbarer Code, deutschsprachige Meldung, kein Stacktrace nach außen. Fehlt ein Fenster (Lücke), ist das ein regulärer Status und kein Fehler.
- **Zeitparameter:** Datumsparameter als lokale Kalendertage (`YYYY-MM-DD`) oder UTC-Zeitstempel, klar benannt (`from_date`, `from_ts`). Höchstgrenze für den Zeitraum pro Anfrage.
- **Versionierung:** `/v1` im Pfad, Schemaversion im Body. Änderungen additiv, Brüche nur mit neuem Pfad.
- **Sicherheit:** Schreibtoken nur als Umgebungsvariable, nie im Repo. Eingaben streng gegen das Schema, Parametrisierte SQL-Abfragen. Keine personenbezogenen Daten.

## 9. Python-Jobs

Python 3.11 (wie die API), Paket unter `jobs/`, Abhängigkeiten schlank (HTTP-Client, `numpy` für Vektormathematik, `pydantic`, Standardbibliothek `zoneinfo`). Kein pandas, kein Scheduler-Framework.

- **Observation-Logger:** Fragt in kurzen Abständen (konfigurierbar, z. B. alle 5 Minuten) die aktuelle Betriebsrichtung ab, speichert Wechsel und Heartbeats. Zusätzlich stündlicher Abruf des METAR (Wind am Flughafen), gespeichert als Winddatenreihe (`wind_observation`, wird für Kalibrierung Stufe 1 gebraucht).
- **Forecast-Job:** Läuft 2 bis 3 mal täglich, zeitlich nach Verfügbarkeit der Modellläufe (Zeiten aus der Doku ableiten, Startwert: 3 mal täglich), holt Ensemble-Daten, berechnet Wahrscheinlichkeiten für 14 Tage, speichert neue Forecast-Zeilen und optional WindAggregates. Idempotenzschlüssel: Lauf-Slot (Datum plus laufende Nummer) und Modell-Initialisierungszeit. Ein wiederholter Lauf dupliziert nichts. Bei teilweisem Ausfall (ein Modell fehlt) Lauf mit Status `partial`, Gewichte renormalisieren, im Datensatz sichtbar machen.
- **Rohdaten-Archiv:** Die Roh-Mitgliederdaten jedes Laufs (komprimiert, z. B. gzip-JSON oder Parquet) auf einem Persistent Volume oder in Objektspeicher ablegen, mit Aufbewahrung von mindestens einem Jahr. Grund: Nur so lässt sich das Entscheidungsmodell später mit besseren Parametern auf alten Läufen neu rechnen. Mengenabschätzung: ca. 140 Mitglieder, 336 Stunden, 2 Variablen, ca. 100 000 Werte pro Lauf, komprimiert wenige hundert Kilobyte.
- **Evaluation-Job:** Vergleicht regelmäßig (täglich) vergangene Forecasts mit `SlotActual` und schreibt `ForecastEvaluation`. Berechnet auch die Klimatologie- und Persistenz-Baselines und `skill_horizon_days`.
- **Slot-Job:** Leitet `SlotActual` aus `Observation` ab (stündlich), inklusive Neuberechnung bei Nachträgen.
- **Backfill-Job:** Füllt Historie nach, gemäß gewählter Datenquelle aus Abschnitt 3. Fortsetzbar (Checkpoint), mit Ratenbegrenzung, ändert nie bereits vorhandene echte Beobachtungen.
- **Kalibrierungs-Werkzeug:** Manuell gestartetes Kommando, das Stufe 1 und 2 (4d) rechnet und eine **Konfigurationsänderung vorschlägt** (kein automatisches Übernehmen).
- Alle Jobs idempotent, mit strukturiertem Logging (JSON auf stdout, Korrelations-ID pro Lauf), Wiederholungen mit exponentiellem Backoff bei Netzwerkfehlern, harten Zeitgrenzen für Anfragen und klarer Fehlerbehandlung. Fällt eine Quelle aus, muss das sichtbar sein (Lücke markieren oder Status melden), nicht stillschweigend als "West" durchgehen.
- Jeder Job meldet seinen Lauf (`JobRun`). Zusätzlich ein **Frische-Wächter** (siehe 13), der meldet, wenn Daten zu alt sind.
- Jeder Job hat einen `--dry-run`-Modus: rechnet und protokolliert, schreibt nichts. Er dient Tests auf der Staging-Umgebung.
- Ausführung: Empfohlen als **Kubernetes-CronJob** auf dem Netcup-Cluster, ein Image `ghcr.io/tobeworks/betriebsrichtung-jobs`, mehrere CronJobs mit unterschiedlichem Kommando. Alternative laut Auftrag: Cron auf dem vorhandenen Server. Entscheidung in Phase 0, Empfehlung Cluster, weil Deployment, Logs und Secrets dort schon etabliert sind. `concurrencyPolicy: Forbid`, Zeitzone der CronJobs in UTC.

## 10. Frontend (Vue 3, TypeScript, Vite, mobil nutzbar)

Eine Single-Page-App ohne Astro. Wo der Website-Workflow Astro-spezifische Dinge beschreibt (Astro-Komponenten, `client:*`-Direktiven, `Base.astro`), gilt hier das Vue/Vite-Äquivalent.

1. **Zeitachse Vergangenheit, heute, Zukunft** in einer Ansicht: pro Tag und Zeitfenster ein Farbfeld von West bis Ost, bei Zukunft mit Prozentzahl, bei Vergangenheit mit tatsächlicher Richtung. Geschätzte Historie (`wind_estimate`) visuell klar von echten Beobachtungen unterscheiden.
2. **Prognosedetails pro Tag:** Streuung der Windrichtung und Windstärke aus den Ensemble-Läufen, Zeitstempel der letzten Berechnung.
3. **Hinweis zur Unsicherheit:** Ab welchem Tag die Prognose deutlich unsicherer wird, anhand der gemessenen Prognosegüte.
4. **Statistik-Ansicht:** Ostanteil pro Woche, Monat und Jahr, längste Ostphase, Vergleich zum Jahresmittel von 25 bis 30 Prozent.
5. **Seite Prognosegüte:** Trefferquote nach Vorlaufzeit gegenüber der Baseline "immer West" (und gegenüber Klimatologie und Persistenz).
6. Barrierefreiheit beachten: Farbe nie als einziger Informationsträger, zusätzlich Text oder Muster.

### 10a. UI-Stack

- Vue 3 mit TypeScript (`strict`), Vite, Vue Router im History-Modus, Pinia nur falls geteilter Zustand es wirklich verlangt (Startpunkt: Composables).
- shadcn-vue (https://www.shadcn-vue.com) als Komponentenbasis, Komponenten per CLI ins Projekt holen und dort anpassen. shadcn-vue baut auf Reka UI auf, das liefert Fokusführung, ARIA und Tastaturbedienung. Die von shadcn-vue erwarteten CSS-Variablen (`--background`, `--primary`, `--ring` und so weiter) werden in `global.css` auf die Tokens dieses Projekts gemappt, es bleiben keine fremden Grautöne und Radius-Standardwerte stehen.
- Tailwind CSS v4 (`@tailwindcss/vite`), Farben und Abstände ausschließlich über Design-Tokens im `@theme`-Block, keine festen Hex-Werte in Komponenten, keine rohen Farbklassen wie `text-white` oder `bg-gray-500`.
- Alle Größen in `rem`, nie `px`. Werte außerhalb der Tailwind-Skala als Arbitrary Values in rem (`text-[0.8125rem]`).
- Keine `<style>`-Blöcke in Komponenten und keine Inline-Styles (`style=""`). Dynamische Werte (Balkenlängen, Füllgrade) über SVG-Attribute oder über feste, quantisierte Klassen, nicht über Styles.
- Icons: Lucide (https://lucide.dev), in Vue über `lucide-vue-next`, keine weiteren Icon-Sets, keine Emojis als Icons.
- Charts bei Bedarf über die Chart-Komponenten von shadcn-vue, keine zusätzliche Chart-Bibliothek ohne Rückfrage. Reicht die Komponente für das Reliability-Diagramm nicht, vorher nachfragen.
- Schrift über Fontsource, nie über Google-Fonts-CDN (Datenschutz): `@fontsource-variable/inter` oder spezifische Gewichte (400, 500, 600), eingebunden in `main.ts`. Ziffern tabellarisch (`font-variant-numeric: tabular-nums`) über eine Utility-Klasse.
- Weitere Abhängigkeiten nur wenn nötig: `@vueuse/core` (Medienabfragen, Online-Status), `lucide-vue-next`. Kein Lenis (kein Scroll-Effekt in einer Datenanwendung), kein Animate-on-Scroll, kein axios (die native `fetch`-API genügt für reine GET-Abfragen).
- `packageManager` in `package.json` auf die lokale pnpm-Version pinnen, `pnpm-workspace.yaml` mit `allowBuilds` für `esbuild` auf `true` (pnpm 11).

### 10b. Farbschema

- Hintergrund: Weiß, helles, ruhiges Layout, viel Weißraum. Zunächst nur Light Mode, die Tokens aber so anlegen, dass ein Dark Mode später möglich ist (semantische Tokens als CSS-Variablen, im Dark Mode mit helleren, weniger gesättigten Varianten statt invertiert, Kontrast dann separat prüfen).
- Primärfarbe 1: `#c8e725` (Lindgrün)
- Primärfarbe 2: `#00adbb` (Türkis)
- Zuordnung für die Betriebsrichtung (Vorschlag, durch den Auftraggeber anzupassen): West (Standard, kein Anflug über Ginsheim-Gustavsburg) in `#c8e725`, Ost (Anflug über Ginsheim-Gustavsburg) in `#00adbb`. Wahrscheinlichkeiten werden als Verlauf von Weiß zur jeweiligen Farbe dargestellt, Sicherheit der Prognose über Sättigung oder Deckkraft (siehe 10c für die empfohlene Umsetzung ohne Mischfarben).
- Kontrast (Schätzwerte, bei der Umsetzung mit einem Prüfwerkzeug nachrechnen): `#c8e725` auf Weiß ca. 1,4 zu 1, `#00adbb` auf Weiß ca. 2,7 zu 1. Beide sind als Text und als dünne Linie auf Weiß unbrauchbar, Weiß als Schrift auf Türkis verfehlt AA ebenfalls. **Dunkle Schrift auf den Flächen** (kühles Dunkelgrau, ca. 5,5 zu 1 auf Türkis und deutlich über 10 zu 1 auf Lindgrün) erfüllt AA. Beide Farben daher vor allem als Flächenfarben verwenden, Text und Linien in einem dunklen Neutralton oder einer dunkleren, aus der Farbe abgeleiteten Variante. Abgeleitete Töne (hell, dunkel, Hover, Rand) als Tokens definieren, erzeugt mit dem Shade-Generator des Website-Workflows (OKLCH, Modus `luminance-anchored`) und als Skalen 50 bis 950 in den `@theme`-Block übernommen.
- Lindgrün und Türkis unterscheiden sich im Kontrast nur um ca. 1,9 zu 1 und damit unter den 3 zu 1 für Bedienelemente. Deshalb trägt die Unterscheidung West gegen Ost **nie** die Farbe allein: Buchstabe oder Wort ("West", "Ost"), Icon und Randmuster kommen immer dazu.
- Neutrale Töne für Text, Ränder und Flächen aus der Tailwind-Grauskala, bevorzugt ein kühles Grau, das zu Türkis passt (z. B. Slate oder Zinc, einmal entscheiden und überall gleich).
- Warn- und Fehlerzustände (Quelle ausgefallen, Daten veraltet) in einer eigenen Signalfarbe, die sich klar von den beiden Primärfarben unterscheidet (Bernstein oder Orange für Warnung, Rot für Fehler), jeweils mit Icon und Text.
- Token-Vorschlag: `background`, `foreground`, `muted`, `muted-foreground`, `border`, `ring`, `west` (mit Skala), `east` (mit Skala), `west-fg`, `east-fg` (dunkle Schrift auf Fläche), `warning`, `danger`, `surface`.

### 10c. Grafische Aufbereitung

- **Zeitachse als Raster:** Zeilen sind Tage, Spalten sind die drei Zeitfenster `morning`, `afternoon`, `night`, jede Zelle ist ein abgerundetes Farbfeld. Ostbetrieb türkis, Westbetrieb lindgrün, bei Prognosen mit Prozentwert und Farbintensität.
  - **Prognosezelle ohne Mischfarbe:** Zwischen Lindgrün und Türkis liegt ein trübes Grün. Statt eines Farbverlaufs bekommt die Zelle einen **geteilten Balken**: Anteil West in Lindgrün, Anteil Ost in Türkis, proportional zur Wahrscheinlichkeit, mit der Prozentzahl darüber in dunkler Schrift. Umsetzung als SVG-Rechteck mit Breitenattribut, keine Inline-Styles. Das ist farbenblindheitsfreundlicher als ein Verlauf. Die Alternative (Verlauf Weiß zu Türkis nur für Ost) bleibt als Option, falls der Auftraggeber sie bevorzugt.
  - **Beobachtungszelle:** Volle Fläche in der Farbe der Richtung, Buchstabe W oder O, bei gemischten Fenstern (Wechsel im Fenster) ein geteilter Balken nach Zeitanteil.
- **Zeitachse Layout:**
  - Mobil: einspaltige Liste, pro Tag eine Zeile mit Datum links (Wochentag, Datum) und drei Zellen rechts, Mindesthöhe 3 rem je Zelle.
  - Desktop: Kalenderwochen-Raster (Spalten Montag bis Sonntag, drei Zeilen für die Fenster), mehrere Wochen untereinander, 14 Tage Zukunft sichtbar ohne Scrollen, Vergangenheit nach oben scrollbar. Alternative, falls das Wochenraster nicht gefällt: die mobile Liste auf eine breitere Spaltenbreite skalieren. Entscheidung beim Prototyp.
  - Navigation: Auswahl des Zeitraums (Vergangenheit laden, "Heute"-Sprung, Wochen vor und zurück), Zustand in der URL (`/?von=2026-10-12`).
- **Heute hervorheben:** Die Zeile des aktuellen Tages bekommt einen klaren Rahmen oder Marker, Vergangenheit links oder oben, Zukunft rechts oder unten, auf dem Handy als vertikale Liste. Der aktuelle Zeitfensterblock wird zusätzlich markiert.
- **Kopfkarte "Jetzt":** Aktuelle Betriebsrichtung mit Quelle und Alter ("Ostbetrieb seit 11:40 Uhr, Quelle Umwelthaus, Stand vor 4 Minuten") und eine Kurzaussage für die nächsten 48 Stunden ("Heute Nachmittag eher West, morgen Vormittag offen"). Wortwahl nach Wahrscheinlichkeitsklassen: unter 20 Prozent "eher West", 20 bis 40 "tendenziell West", 40 bis 60 "offen", 60 bis 80 "tendenziell Ost", über 80 "eher Ost".
- **Echt, geschätzt, Prognose klar trennen:** Echte Beobachtungen als volle Fläche, Prognosen mit Prozentzahl und weicherer Fläche (hellere Töne aus der Skala, **nicht** Deckkraft, damit der Schriftkontrast erhalten bleibt), geschätzte Historie (`wind_estimate`) schraffiert (Muster über eine Utility-Klasse mit `repeating-linear-gradient`). Lücken: gestrichelter Rand, Icon `CircleHelp` und Text "keine Daten". Zusätzlich eine kleine Legende mit allen vier Zuständen, mit dem Muster selbst, nicht nur Farbe.
- **Unsicherheit sichtbar machen:** Ab dem Tag `skill_horizon_days` ein dezenter Trenner mit Text ("Ab hier ist die Prognose nur noch wenig besser als der langjährige Durchschnitt"), Zellen dahinter zurückhaltender dargestellt (hellere Töne, kleinere Prozentschrift, weiterhin lesbar). Solange die Zahl vorläufig ist, steht "vorläufig" dabei.
- **Detailansicht pro Zeitfenster** (Sheet auf dem Handy, Popover auf dem Desktop; Öffnen per Klick, Tastatur und per URL `?datum=…&fenster=…`): Wahrscheinlichkeit, Streuung der Windrichtung als kleiner Kompass (Bahnachse 070/250 eingezeichnet, Sektor mit Rückenwind markiert, Mitglieder als Punkte oder Windrose) oder Balken, Windstärke (Median und P10 bis P90), Modelle mit Anzahl Mitglieder und Einzelwahrscheinlichkeit, Zeitpunkt der letzten Berechnung, **Verlauf der Prognose über die letzten Berechnungen** als kleines Liniendiagramm (springt die Aussage oder ist sie stabil?). Auch eine Tabellenansicht als Alternative zu jeder Grafik.
- **Statistik:** Balkendiagramm oder Liniendiagramm für Ostanteil pro Woche und Monat, mit eingezeichneter Referenzlinie für das Jahresmittel von 25 bis 30 Prozent (als Band zwischen 25 und 30). Kennzahlen als Karten (Card) mit großer Zahl und kurzer Erklärung. Zusätzlich möglich: Kalender-Heatmap über ein Jahr (höchstens 365 Zellen), Tageszeitprofil (Ostanteil je Fenster), Anzahl Richtungswechsel. Datenbasis (Anteil geschätzter Daten) steht immer am Diagramm.
- **Prognosegüte:** Liniendiagramm Trefferquote nach Vorlaufzeit, die Baseline "immer West" als gestrichelte Vergleichslinie, weitere Baselines (Klimatologie, Persistenz) per Umschalter. Konfidenzband in 15 Prozent Deckkraft derselben Farbe. Hauptaussage als Satz über der Grafik. Reliability-Diagramm im Erklärbereich. Bei zu wenig Daten: Leerzustand mit Erklärung, wie viele Vergleiche noch fehlen.
- **Typografie:** Eine serifenlose Schrift (Inter oder die Standard-Systemschrift), klare Hierarchie über Größe und Gewicht, tabellarische Ziffern für Zahlen, Fließtext mindestens 1 rem, Zeilenlänge im Erklärtext 60 bis 75 Zeichen. Responsive Größen für schmale Kontexte über `clamp()`, nicht über feste Tokens.
- **Form und Stil:** Ruhig, technisch, leicht freundlich. Abgerundete Ecken, dünne Ränder, kaum Schatten, großzügiger Abstand. Spacing-Skala in Schritten von 0,25 rem. Keine Großschreibung per Markup, Versalien nur per CSS-Klasse und sparsam (diese App ist ruhig, keine Versal-Überschriften).
- **Responsive:** Mobile First. Auf dem Handy eine einspaltige Liste mit horizontal kompakten Zeilen, auf dem Desktop das Raster mit mehr Tagen nebeneinander. Prüfbreiten 375, 768, 1024, 1440 Pixel sowie Querformat. Kein horizontaler Seitenscroll, `min-h-dvh` statt `100vh`, Safe-Area-Abstände (`env(safe-area-inset-*)`) bei fixierten Leisten.
- **Zustände:** Ladezustand über Skeletons in der Form der echten Zellen (kein Layout-Sprung), Leerzustand mit kurzer Erklärung, Fehlerzustand mit klarer Meldung und Wiederholen-Aktion (`role="alert"`), **veraltete Daten** als Hinweisband (Alert, Warnfarbe, Icon) mit Zeit der letzten Aktualisierung, **Offline** ebenso, mit zuletzt geladenen Daten als Fallback.
- **Barrierefreiheit:** Farbe nie als einziger Informationsträger, immer zusätzlich Text, Prozentzahl, Muster oder Icon. Fokuszustände, Tastaturbedienung und Beschriftungen für Screenreader.
  - Die Zeitachse ist semantisch eine **Tabelle** (`<table>` mit `<caption>`, Spaltenköpfe `morning`/`afternoon`/`night` als "Vormittag", "Nachmittag", "Nacht", Zeilenköpfe pro Tag), mobil per CSS umgebrochen. Jede Zelle hat einen vollständigen zugänglichen Namen ("Samstag, 18. Oktober, Vormittag, Prognose, 62 Prozent Ostbetrieb, Stand 16. Oktober 07:40 Uhr").
  - Pfeiltasten wandern durch das Raster (Roving Tabindex), Enter oder Leertaste öffnet die Details, Escape schließt und gibt den Fokus an die Zelle zurück.
  - Charts: Textzusammenfassung (`aria-label` oder sichtbarer Satz) mit der Kernaussage, Tabellenansicht als Alternative, Tooltips auch per Tastatur erreichbar, Muster zusätzlich zu Farbe.
  - Nach Routenwechsel Fokus auf die Hauptüberschrift, Skip-Link "Zum Inhalt springen" als erstes Element, `<main id="main-content">`, `:focus-visible` global mit sichtbarem Ring.
  - Aktualisierungen im Hintergrund melden sich über `aria-live="polite"`, ohne den Fokus zu stehlen.
  - Touch-Ziele mindestens 2,75 rem, Abstand zwischen Zielen mindestens 0,5 rem.
  - `prefers-reduced-motion` respektieren: Keine Animation, nur Zustandswechsel.
  - Animationen sparsam, 150 bis 300 ms, nur `transform` und `opacity`, Ausblenden schneller als Einblenden. Optional dezente Übergänge zwischen Routen über `@view-transition` beziehungsweise die View-Transitions-API, mit Abschaltung bei reduzierter Bewegung.

### 10d. Komponenten und Icons

- shadcn-vue-Komponenten: Card, Tabs, Badge, Tooltip, Popover oder Sheet, Skeleton, Button, Select, Separator, Alert, Toggle Group, Chart. Zusätzlich möglich: Table, Collapsible (Erklärbereich), Toggle, Breadcrumb entfällt.
- Lucide-Icons als Vorschlag: `Sunrise` (morning), `Sun` (afternoon), `Moon` (night), `PlaneLanding` und `PlaneTakeoff` für Landung und Start, `Wind`, `Compass`, `CalendarDays`, `History`, `ChartLine`, `Info`, `TriangleAlert`, `CircleHelp` (Lücke), `RefreshCw` (Wiederholen), `WifiOff` (offline).
- Icons mit einheitlicher Strichstärke und Größe (Größen als Tokens), nur in Verbindung mit Text, wo die Bedeutung sonst unklar ist. Icon-Buttons haben immer einen zugänglichen Namen.

### 10e. Projektstruktur Frontend

```
frontend/
  index.html
  package.json
  pnpm-workspace.yaml
  vite.config.ts
  tsconfig.json
  Dockerfile
  nginx.conf
  public/
    favicon.ico
    favicon-16x16.png
    favicon-32x32.png
    apple-touch-icon.png
    manifest.webmanifest
    og.png
    robots.txt
  src/
    main.ts
    App.vue
    router.ts
    styles/global.css
    api/
      client.ts
      generated/
    composables/
    components/
      ui/
      timeline/
      detail/
      charts/
      layout/
    pages/
      TimelinePage.vue
      StatsPage.vue
      QualityPage.vue
      MethodPage.vue
      StatusPage.vue
      LegalImprintPage.vue
      PrivacyPage.vue
      NotFoundPage.vue
    lib/
      format.ts
      probability.ts
    config/site.ts
  tests/
```

- `src/config/site.ts` hält Name, URL, Kontakt, Datenquellen-Hinweise (analog `site.ts` im Website-Workflow), nichts davon in Komponenten hartcodieren.
- Seiten enthalten nur Zusammenstellung, Logik wandert in Composables und `lib/`.
- Eine Komponente pro Bereich, keine Riesen-Dateien. Wiederholte Klassenkombinationen (ab drei Klassen an mindestens zwei Stellen) werden `@utility`-Klassen in `global.css`. Die Übersicht der Utility-Klassen steht in `docs/frontend.md` (kein Kommentarblock im Code). Geplante Klassen: `page-container`, `section-eyebrow`, `heading-page`, `heading-section`, `stat-number`, `slot-cell` (mit Zustandsattributen), `pattern-estimated`, `legend-chip`, `text-fine`.
- Abstand zwischen Eyebrow und folgendem Inhalt als ein Token (`--eyebrow-gap`) für alle Sektionen.
- Anker und Sprünge: `scroll-margin-top` über eine Variable für die Kopfhöhe, `scroll-behavior: smooth` nur ohne reduzierte Bewegung.

### 10f. Routen und Seiten

| Pfad | Seite | Inhalt |
|---|---|---|
| `/` | Verlauf und Prognose | Kopfkarte, Zeitachse, Legende, Detail per Query |
| `/statistik` | Statistik | Kennzahlenkarten, Diagramme, Zeitraumwahl |
| `/prognosegute` | Prognosegüte | Hauptaussage, Linien, Baselines, Reliability |
| `/methodik` | Methodik | Wie die Prognose entsteht, Grenzen, Quellen, Glossar, FAQ |
| `/status` | Status | Frische der Quellen, letzte Jobläufe, Versionen |
| `/impressum`, `/datenschutz` | Rechtstexte | `noindex` |
| `*` | 404 | Gleiches Layout, Link zur Startseite, `noindex` |

- Alle Zustände (Zeitraum, Fenster, Modellumschalter, Baseline) in der URL, damit Links teilbar sind und die Browser-Zurück-Taste Zustand und Scrollposition wiederherstellt.
- Navigation: Auf dem Handy untere Leiste mit vier Zielen (Verlauf, Statistik, Güte, Methodik), Icon und Text, aktiver Eintrag markiert. Auf dem Desktop dieselbe Navigation oben. Status und Rechtstexte im Fußbereich.
- `index.html` enthält Titel, Beschreibung, Canonical, Open-Graph- und Twitter-Tags, Theme-Color, Manifest. Ein SPA hat keine seitenweisen Metadaten ohne Zutun, deshalb Titel und `meta description` pro Route per Router-Guard setzen. Die App ist indexierbar (Stand 17.10.2026).
- Favicons und `manifest.webmanifest` mit dem Favicon-Generator des Website-Workflows aus einem Logo erzeugen. Logo und Name sind noch offen.

### 10g. Datenzugriff im Frontend

- Ein schmaler API-Client auf Basis `fetch` mit Zeitlimit, Fehlernormalisierung und den generierten Typen. Basis-URL aus einer Umgebungsvariablen (`VITE_API_BASE`).
- Composables pro Anwendungsfall (`useTimeline`, `useSlotDetail`, `useStats`, `useEvaluation`, `useStatus`), mit Zuständen `loading`, `error`, `data`, `stale`. Optional `@tanstack/vue-query` nur, wenn Cache und Wiederholungen von Hand zu aufwendig werden (vorher nachfragen).
- Caching: Antworten kurz im Speicher halten, im Hintergrund erneuern beim Zurückkehren in den Tab (`visibilitychange`), Aktualisierung der Kopfkarte alle paar Minuten, die Zeitachse seltener. Keine Dauerabfrage im Hintergrundtab.
- Abbruch bei Routenwechsel (`AbortController`), keine Doppelabfragen.
- Das Frontend rechnet **keine** Wahrscheinlichkeiten, Fenster oder Zeitzonen-Logik um. Es zeigt an, was die API liefert (`local_date`, `slot`, `p_east`, `status`). Das vermeidet zwei Implementierungen der Fensterlogik und Fehler bei der Zeitumstellung. Formatierung nur über `Intl.DateTimeFormat` mit `timeZone: "Europe/Berlin"` und `de-DE`.
- Zahlenformat: Prozent mit geschütztem Leerzeichen (`62 %`), Dezimalkomma, Datum "Sa., 18.10.".

### 10h. Texte und Tonalität

- Deutsch, du-neutral oder Sie-neutral (Entscheidung in Phase 0, Empfehlung: sachlich ohne direkte Anrede), ohne Gedankenstriche, ohne Alarmismus. Beispiele: "Ostbetrieb wahrscheinlich", nicht "Achtung: Fluglärm!".
- Jede Prognoseaussage trägt, wo sinnvoll, ihren Stand ("Berechnet am Freitag um 07:40 Uhr").
- Immer vorhanden: kurzer Haftungshinweis ("Keine amtliche Auskunft, keine Garantie.") und Verweis auf die Methodikseite.
- Fehlermeldungen nennen Ursache und nächsten Schritt ("Die Prognose konnte nicht geladen werden. Bitte erneut versuchen.").
- Alle Texte zentral in einer Datei beziehungsweise in den Komponenten gebündelt, keine verstreuten Zeichenketten in der Logik. Mehrsprachigkeit ist nicht vorgesehen.

### 10i. Performance-Ziele

- Erste nutzbare Ansicht mobil unter 2 Sekunden auf durchschnittlichem Mobilfunk, Initial-JavaScript unter ca. 150 kB komprimiert. Diagramme (shadcn-vue Chart) per Routen-Lazy-Loading erst auf den Statistikseiten laden.
- Core Web Vitals: LCP unter 2,5 s, CLS unter 0,1 (Skeletons mit fester Höhe), keine Layout-Sprünge durch nachgeladene Schrift (`font-display: swap`, nur lateinische Teilmenge).
- **Das LCP-Element darf nicht aus dem Datenabruf kommen.** Kopfzeile und Gerüst der Seite stehen sofort, Daten füllen Zellen. Keine Opacity-Animation auf dem größten sichtbaren Element (Erfahrung aus dem Website-Workflow: Opacity 0 beim Messzeitpunkt führt zu `NO_LCP`).
- Prüfung mit dem Skill `lighthouse-lokal` gegen den gebauten Docker-Container (nginx, gzip), nicht gegen den Dev-Server.

### 10j. Rechtliches und Datenschutz

- Keine Cookies, kein Tracking, keine externen Schriften oder Skripte (Fontsource statt Google Fonts). Dann ist kein Einwilligungsbanner nötig. Falls eine Reichweitenmessung gewünscht ist, nur datenschutzfreundlich und selbst gehostet, vorher nachfragen.
- Datenschutzerklärung (Server-Logs, Hosting, keine Cookies) und Impressum, sobald die App öffentlich ist. Attribution der Datenquellen auf der Methodikseite und im Fuß (Open-Meteo nach CC BY 4.0, Umwelthaus, DWD, Iowa Mesonet falls genutzt).
- Die Seiten `Impressum` und `Datenschutz` sind `noindex`.

### 10k. Mobile-Komfort (oberste Gestaltungspriorität)

Die App wird zuerst für das Handy entworfen, der Desktop ist die Erweiterung. Bei Zielkonflikten gewinnt die einhändige Bedienung auf einem kleinen Gerät (Referenz: 375 mal 667 Pixel, iPhone SE, und 360 mal 740 Pixel, günstiges Android). Jede Ansicht wird zuerst mobil gebaut, abgenommen und erst dann skaliert.

**Daumenzone und Einhandbedienung**

- Alle häufigen Bedienelemente liegen im unteren Drittel: Hauptnavigation als untere Leiste (vier Ziele mit Icon und Text, Höhe mindestens 3,5 rem plus Safe-Area-Abstand), Zeitraumwahl und "Heute"-Sprung als untere, schwebende Schaltfläche beziehungsweise untere Segmentleiste. Oben stehen nur Titel und Status, nichts, was man oft antippt.
- Details öffnen als **Bottom Sheet** (shadcn-vue Drawer, basiert auf `vaul-vue`) mit Griff, Haltepunkten (halbe und volle Höhe), Wegwischen nach unten, sichtbarer Schließen-Schaltfläche und Escape. Die **Android-Zurück-Taste und die iOS-Wischgeste schließen das Sheet** (Sheet-Zustand liegt in der URL beziehungsweise im Verlauf), sie verlassen nicht die App.
- Kein Hover als einziger Weg, keine Drag-and-Drop-Interaktionen, keine Gesten ohne sichtbare Alternative. Wischen zwischen Tagen oder Wochen ist nur Zusatz, es gibt immer Schaltflächen.
- Antippflächen mindestens 2,75 rem, wichtige mindestens 3 rem, Abstand mindestens 0,5 rem. Ganze Zeilen und ganze Zellen sind antippbar, nicht nur kleine Icons. Keine Aktionen am äußersten Bildschirmrand (Konflikt mit System-Gesten).
- `touch-action: manipulation` auf bedienbaren Elementen (kein Doppeltipp-Zoom-Verzögern), definiertes Rückmeldeverhalten innerhalb von 100 ms (`:active`-Zustand durch Farbwechsel, kein Layout-Sprung), `-webkit-tap-highlight-color` bewusst gesetzt statt Browser-Standard.

**Layout und Viewport**

- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`. **Zoomen bleibt erlaubt**, keine Sperre.
- Höhen mit `dvh` und `svh` statt `vh`, damit einklappende Browserleisten (Safari, Chrome) keine abgeschnittenen Bereiche oder Sprünge erzeugen. Feste Leisten berücksichtigen `env(safe-area-inset-bottom)` und `-top`, Inhalte haben ausreichend Polsterung, damit nichts hinter der unteren Leiste verschwindet.
- Seitenränder 1 rem (16 px) auf dem Handy, volle Breite für Zellen, kein horizontaler Seitenscroll auf jeder Breite ab 320 Pixel. Querformat bleibt bedienbar (untere Leiste wird seitliche Leiste oder verschwindet, Inhalte nicht abgeschnitten).
- `overscroll-behavior` so setzen, dass **Pull-to-Refresh des Browsers erhalten bleibt** (Aktualisieren der Daten per Ziehen ist erwünscht), aber Sheets nicht die darunterliegende Seite mitscrollen (`overscroll-behavior: contain` im Sheet).
- Scrollposition und Filter bleiben beim Zurücknavigieren erhalten (Router `scrollBehavior`, Zustand in der URL).

**Informationsdichte der Zeitachse auf dem Handy**

- Pro Tag eine Zeile mit Mindesthöhe 3 rem und drei gleich breiten Zellen. Kein Text kleiner als 0,875 rem, Prozentzahlen mindestens 1 rem und tabellarisch ausgerichtet, damit man die Spalte mit dem Blick überfliegen kann.
- Datum links als Wochentag plus Tag ("Sa 18."), **Wochenende und Feiertage dezent hervorgehoben**, weil die Planung meist auf diese Tage zielt. Der heutige Tag ist beim Öffnen **bereits im Sichtbereich** (Scroll auf "Heute" beim Start, Vergangenheit liegt darüber).
- Die Spaltenköpfe (Vormittag, Nachmittag, Nacht, mit Icon) und die Kopfkarte "Jetzt" sind **angeheftet** (sticky) beziehungsweise klappen beim Scrollen zu einer schmalen Leiste zusammen, damit der Bezug erhalten bleibt, ohne Bildschirmfläche zu verschwenden.
- **Tagesleiste** zum schnellen Springen: waagerechte Reihe von Datumschips mit Scroll-Snap und sichtbarem Randverlauf als Hinweis, dass mehr folgt. Ausnahme vom Verbot des horizontalen Scrollens, weil sie ein Bedienelement und keine Seitenbreite ist, hat aber zusätzlich "Heute".
- Tippen auf eine Zelle öffnet das Fenster-Detail, Tippen auf das Datum öffnet die Tagesübersicht mit allen drei Fenstern und dem Verlauf. Beide Wege haben denselben Sheet-Aufbau.
- Details im Sheet in der Reihenfolge der Wichtigkeit: 1. Aussage in einem Satz mit Prozentzahl, 2. Stand der Berechnung, 3. Wind in Klartext, 4. Kompass und Verlauf, 5. Modelle und Methodik. Alles unterhalb der ersten beiden Punkte darf eingeklappt sein (Collapsible).

**Diagramme auf dem Handy**

- Vereinfachte Mobildarstellung: weniger Achsenmarken, größere Schrift (mindestens 0,75 rem), Hochformat-Proportionen, keine überladenen Legenden. Legende direkt unter dem Diagramm, nicht außerhalb des sichtbaren Bereichs.
- Interaktion per Tippen oder Wischen entlang der Zeitachse. Der **Messwert erscheint in einer festen Anzeige oberhalb des Diagramms**, nicht in einem Tooltip unter dem Finger (der Finger verdeckt sonst den Wert). Jeder Datenpunkt hat eine ausreichend große Trefferfläche (mindestens 2,75 rem), beziehungsweise der nächste Punkt wird gewählt.
- Zeitraum- und Baseline-Auswahl als Segmentschalter mit großen Zielflächen (Toggle Group), nicht als kleine Dropdowns. `Select` nur bei mehr als vier Optionen, dort das native Auswahlmenü des Systems bevorzugen.
- Tabellenansicht als Alternative bleibt, Tabellen brechen mobil in Kartenzeilen um (kein seitliches Scrollen von Tabellen).

**Lesbarkeit und Systemeinstellungen**

- Alle Größen in `rem`, damit die Systemschriftgröße und "größerer Text" greifen. Getestet bis 200 Prozent Textvergrößerung ohne abgeschnittene Inhalte oder überlappende Elemente (Zeilen dürfen höher werden).
- Hoher Kontrast und reduzierte Bewegung respektieren (`prefers-contrast`, `prefers-reduced-motion`). Dunkelmodus der Systemeinstellung später, die Tokens sind vorbereitet.
- Eingabefelder (falls später nötig) mit mindestens 1 rem Schrift, damit iOS nicht zoomt. Aktuell gibt es kaum Eingaben, trotzdem als Regel für Suche oder Datumswahl (native Datumsauswahl `<input type="date">` vor eigenen Pickern).
- Zeilenlänge der Erklärtexte mobil 35 bis 60 Zeichen, Abschnitte kurz, Zwischenüberschriften, wichtige Aussage zuerst.

**Geschwindigkeit und Netz**

- Ziel: Hauptansicht auf einem Mittelklasse-Android über 4G in unter 2 Sekunden nutzbar. Initial-JavaScript unter ca. 150 kB komprimiert, Diagramme erst auf den Statistikseiten (Routen-Lazy-Loading), Antwort von `GET /timeline` unter ca. 30 kB komprimiert (Felder knapp halten, nur das Nötige senden).
- **Sofortige Anzeige aus dem Zwischenspeicher:** Die zuletzt geladene Zeitachse wird lokal gehalten (`localStorage` beziehungsweise IndexedDB, mit Fehlerbehandlung) und beim Öffnen sofort gezeigt, mit klarer Kennzeichnung "Stand: vor 2 Stunden", im Hintergrund aktualisiert (Stale-While-Revalidate). Keine leere Seite mit Spinner, wenn Daten vorliegen.
- Skeletons in exakter Zellgröße, keine Layoutsprünge. Bei schlechter Verbindung oder Offline eine verständliche Meldung mit "Erneut versuchen" und weiterhin die zwischengespeicherten Daten.
- `Save-Data` und langsame Verbindungen: Auf Diagramme und Zusatzdaten (Verlauf der Prognose, Kompass) wird erst beim Öffnen des Details nachgeladen.
- Aktualisierung beim Zurückkehren in die App (`visibilitychange`) und per Pull-to-Refresh, keine Dauerabfragen im Hintergrund (Akku, Datenvolumen).

**Teilen und Installation**

- Teilen-Schaltfläche im Fenster-Detail über die **Web-Share-API** (`navigator.share`) mit Link auf genau dieses Fenster, Rückfall auf "Link kopieren". Die Vorschaubilder (Open Graph) bleiben allgemein, da die Seite statisch ist.
- Manifest mit `display: standalone`, Themenfarbe und Icons, damit "Zum Home-Bildschirm hinzufügen" sauber funktioniert (Name, Icon, Startansicht). Ein Service Worker ist weiterhin nicht Teil des Umfangs (Abschnitt 12).

**Prüfung auf echten Geräten**

- Playwright mit Geräteprofilen (iPhone SE, iPhone 15, Pixel 7, kleines Android 360 Pixel breit, Tablet 768) in Hoch- und Querformat, dazu **manuelle Prüfung auf mindestens einem echten iPhone (Safari) und einem echten Android-Gerät (Chrome)** vor jeder Abnahme von Phase 9 und 10: Einhandbedienung, Sheet-Gesten und Zurück-Taste, einklappende Browserleiste, Notch und Home-Indikator, Textvergrößerung, Flugmodus.
- Eine Checkliste "Mobile Abnahme" in `docs/frontend.md` mit den obigen Punkten, jede Seite wird einzeln abgehakt.

## 11. Deployment, Betrieb der Infrastruktur und Versionierung

Dieser Abschnitt folgt dem Skill `tobeworks-deploying` und dem Website-Workflow, angepasst auf eine Vite-SPA.

### 11a. Images

Zwei Images, zwei Dockerfiles, beide gebaut von GitHub Actions nach GHCR:

| Image | Inhalt | Port |
|---|---|---|
| `ghcr.io/tobeworks/betriebsrichtung` | Frontend (statisch, nginx) | 80 |
| `ghcr.io/tobeworks/betriebsrichtung-jobs` | Python-Jobs | kein Port |

**Frontend-Dockerfile:**

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_BASE
ARG VITE_BUGDROP=false
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_BUGDROP=$VITE_BUGDROP
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`nginx.conf` für die SPA** (anders als bei Astro: Fallback auf `index.html`, Vite legt Assets unter `/assets/` ab):

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/css text/javascript application/javascript application/json image/svg+xml font/woff2;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location ~* \.(ico|png|webmanifest|svg)$ {
        add_header Cache-Control "public, max-age=604800";
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri /index.html;
    }
}
```

Eigene 404-Seite: Für unbekannte Pfade liefert die SPA `index.html` und die Router-Route `*` zeigt die 404-Seite (mit `noindex`). Optional gibt nginx für Pfade ohne gültige Route einen echten Statuscode 404 zurück, das ist in einer SPA ohne Routenliste im Server nur mit Aufwand möglich und wird bewusst nicht gemacht. Dokumentieren.

Sicherheits-Header (Content-Security-Policy mit `default-src 'self'` und der API-Domain unter `connect-src`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) in `nginx.conf` ergänzen. Falls BugDrop auf Staging aktiv ist, muss die CSP dort dessen Domain erlauben, deshalb pro Umgebung unterschiedlich oder auf Staging weniger streng (Entscheidung beim Aufbau).

**Jobs-Dockerfile:** `python:3.11-slim`, Abhängigkeiten aus einer gesperrten Datei, Nicht-Root-Benutzer, Standardkommando nur `--help`, die CronJobs setzen das Kommando.

### 11b. Kubernetes (Netcup-Repo)

- `apps/betriebsrichtung/` (Staging, Image `:develop`, Domain `betriebsrichtung.tobeworks.de`, Entscheidung offen) und `apps/betriebsrichtung-prod/` (Image `:latest`, echte Domain). Jeweils `namespace.yaml`, `deployment.yaml`, `service.yaml`, `ingress.yaml` (zwei Ingress-Objekte: HTTP-Weiterleitung und HTTPS mit cert-manager, `ingressClassName: traefik`) und die **Pflichtdatei `kustomization.yaml`**. Ohne sie passiert still nichts.
- `deployment.yaml`: Ressourcen-Requests und -Limits (z. B. 50m/64Mi bis 200m/128Mi für nginx), `imagePullSecrets: ghcr-secret2`, Lebendigkeits- und Bereitschaftsprüfung auf `/` (Port 80, passend zum Dockerfile).
- `apps/betriebsrichtung-jobs/` mit `CronJob`-Objekten (Observation-Logger alle 5 Minuten, Forecast 3 mal täglich, Slot stündlich, Evaluation täglich, Frische-Wächter alle 15 Minuten), `concurrencyPolicy: Forbid`, `successfulJobsHistoryLimit` und `failedJobsHistoryLimit` klein, Secrets (Schreibtoken, API-Basis-URL) als Kubernetes-Secret, ein Persistent Volume für das Rohdaten-Archiv, falls kein Objektspeicher gewählt wird. Image-Aktualisierung bei CronJobs: Prüfen, ob der Image Updater per Kustomize-Override greift oder `imagePullPolicy: Always` genügt (jeder Lauf zieht das aktuelle Image). Im Zweifel die einfachere Variante wählen.
- Staging und Produktion nutzen **dieselbe Daten-Pipeline** (ein Satz Jobs, eine API-Datenbank). Das Staging-Frontend liest dieselbe API. Staging dient zum Prüfen von Frontend-Änderungen und für BugDrop, nicht für getrennte Daten.
- Die ArgoCD-Anwendungen (`cluster/argocd-apps/betriebsrichtung.yaml`, `…-prod.yaml`, `…-jobs.yaml`) und **Image-Updater-CRs** (`cluster/image-updater/betriebsrichtung.yaml`, `…-prod.yaml`, ggf. `…-jobs.yaml`) nach dem Muster des Skills. In den Annotationen `image-list` ohne `:latest`, im CR `imageName` mit Tag und `updateStrategy: digest`. Ohne CR keine Auto-Updates.
- Einmalig pro App: ArgoCD-Application anwenden, Pull-Secret `ghcr-secret2` in den neuen Namespace kopieren, Image-Updater-CR anwenden, Logs prüfen. Reihenfolge: zuerst Staging, im Browser prüfen, erst danach Produktion.
- Nach dem ersten Push: Im GitHub-Paket das Repository verlinken, damit der Pull-Zugriff klappt.
- DNS und TLS: Zertifikat bleibt "pending", solange DNS auf einen falschen Server zeigt. Zuerst `dig` prüfen. Falls mit www-Weiterleitung gearbeitet wird: Middleware-Name kurz halten, nie mit Namespace-Präfix (Traefik-Falle).

### 11c. GitHub Actions

- `docker-build.yml` für das Frontend mit Zwei-Umgebungs-Variante: Branch `develop` baut `:develop` mit `VITE_BUGDROP=true`, `main` baut `:latest` mit `VITE_BUGDROP=false`. Cache-Scope pro Tag. `VITE_API_BASE` als Build-Argument.
- Eigener Workflow für das Jobs-Image (Pfadfilter `jobs/**`, Tag nur auf `main`).
- Weitere Workflows: Tests (Vitest, Typprüfung, Linting, Python-Tests), CI-Check aus 7d, Major-Tag auf `main` (`tag-major.yml` aus dem Website-Workflow, erst ab Version 1.0.0 wirksam).

### 11d. BugDrop (Feedback auf Staging)

Das In-App-Feedback-Widget BugDrop wird nur im Develop-Build aktiv. In einer Vite-App ohne Astro: Beim Start in `main.ts` ein Skript-Element anhängen, wenn `import.meta.env.VITE_BUGDROP === "true"`. Auf `main` ist der Zweig durch den Build entfernt. Kontrolle nach dem ersten Staging-Deploy: Im Quelltext der Produktion darf `bugdrop.neonwatty.workers.dev` nirgends vorkommen. Screenshots landen auf dem Branch `bugdrop-screenshots`, Issues mit Label `bugdrop` abarbeiten.

### 11e. Versionierung

Husky, commitlint (Conventional Commits) und release-it mit `@release-it/conventional-changelog` am Repo-Wurzelverzeichnis (Tooling-Paket mit eigenem `package.json`). Version steht in `frontend/package.json` beziehungsweise im Wurzelpaket (Entscheidung beim Aufbau, eine einzige Quelle), Anzeige der Version im Fuß über eine Build-Konstante. `.husky/pre-commit` bleibt leer, damit Work-in-Progress Commits nicht blockiert. Commits kurz, eine Zeile.

## 12. Nicht im Umfang (später möglich)

- Benachrichtigungen bei mehreren Ostbetriebs-Tagen in Folge (Web-Push oder E-Mail über die vorhandene Mail-API).
- Eigene Lärmeinträge ("heute laut, Schlaf schlecht") zur Verknüpfung mit der Betriebsrichtung.
- Anbindung von Fluglärm-Messstationen, falls öffentlich verfügbar.
- Öffentlicher Zugang für Dritte und Einbettbares Widget.
- Dark Mode (Tokens sind vorbereitet).
- Kalender-Abo (iCal) mit Ost-Prognose, Teilen-Funktion für Einzelfenster als Bild.
- Weitere Flughäfen (die Konfiguration ist dafür vorbereitet, das Schema enthält deshalb die ICAO-Kennung in der Konfiguration, nicht in den Daten).
- Offline-Modus als installierbare Web-App mit Service Worker.

## 13. Betrieb, Monitoring, Datenqualität

- **Statusseite** (`/status` im Frontend, `GET /status` in der API): Alter der letzten Beobachtung je Quelle, Zeit des letzten erfolgreichen Forecast-Laufs, Konfigurations- und Schemaversion, Anzahl Lücken der letzten 7 Tage.
- **Frische-Wächter:** Ein Mini-Job prüft regelmäßig die Frische der Daten und schickt bei Überschreitung eine E-Mail über die vorhandene Mail-API (`POST /mail/send`) an den Betreiber. Grenzwerte als Startwerte: Beobachtung älter als 30 Minuten, Forecast älter als 14 Stunden, Evaluation älter als 36 Stunden. Alarm nur einmal je Störung, mit Entwarnung.
- **Logging:** Strukturiert, Ablage über das Cluster-Logging. Fehlschläge von Jobs nie nur im Log, immer auch als `JobRun` mit Status.
- **Datenqualität:** Plausibilitätsprüfungen beim Schreiben (Windwerte im Wertebereich, Richtung 0 bis 360, Wahrscheinlichkeiten 0 bis 1, Fenster konsistent). Ungültige Quellantworten werden verworfen und gemeldet.
- **Sicherung:** Regelmäßige Datenbanksicherung der Tabellen dieses Projekts, Wiederherstellung einmal getestet. Roh-Archiv gehört in die Sicherung.
- **Aufbewahrung:** `Observation`, `SlotActual`, `ForecastEvaluation` dauerhaft. `Forecast` und `WindAggregate` dauerhaft (klein). Roh-Archiv mindestens 12 Monate.
- **Schemaänderungen:** Immer additiv bevorzugen, destruktive Änderungen nur nach Freigabe (siehe 7a). Schemaversion hochzählen, alte Jobs nicht stillschweigend weiter schreiben lassen.
- **Abhängigkeitspflege:** Open-Meteo-Modellnamen und Mitgliederzahlen werden beim Lauf geprüft. Weicht die Zahl der Mitglieder ab, entsteht eine Warnung im `JobRun` (Hinweis auf Modelländerung, relevant für die Kalibrierung).

## 14. Teststrategie

| Ebene | Was | Werkzeug |
|---|---|---|
| Schema | Gültige und ungültige Beispiele je Entität, `x-db`-Vollständigkeit, Formate | pytest, `jsonschema` |
| Generatoren | Golden Files: Schema rein, DDL und Typen raus, Abweichung schlägt an | pytest, Diff |
| Zeit | Umstelltage (4a), Fenstergrenzen, Nacht über Mitternacht, 23- und 25-Stunden-Tage, Jahreswechsel | pytest |
| Fachlogik | Rückenwindformel an Eckfällen (Wind genau aus 070, 160, 250, 340 Grad), Zustandsautomat (Flackern, Hysterese, Mindestdauer, Anfangszustand), zirkuläre Statistik (Mittel von 350 und 10 Grad ist 0 Grad) | pytest, feste Fixtures |
| Modell | Regressionstest mit eingefrorenem Ensemble-Beispiel: Eingabe fix, Ausgabe fix | pytest |
| Jobs | Idempotenz (zweimal laufen lassen = gleiches Ergebnis), Teilausfälle (Modell fehlt, Quelle 500), Zeitlimits, `--dry-run` schreibt nichts | pytest, HTTP-Mock |
| API | Auth, Validierung, Fehlerformat, Atomarität des Forecast-Laufs, Paginierung, Caching-Header | pytest (API-Repo) |
| Auswertung | Brier-Score und Skill Score an Handrechenbeispielen, Bootstrap mit festem Seed, Klimatologie ohne Zukunftswissen (kein Datenleck) | pytest |
| Frontend Einheit | Formatierer, Wahrscheinlichkeitsklassen, Komponenten mit Zuständen (laden, leer, Fehler, veraltet) | Vitest, Vue Test Utils |
| Frontend E2E | Zeitachse sichtbar, Detail per URL, Tastaturbedienung, mobile und Desktop-Ansicht, Zeitumstellungs-Fixture | Playwright |
| Mobile | Geräteprofile (320 bis 768 Pixel, Hoch- und Querformat), Sheet schließt per Zurück, Touch-Zielgrößen, Textvergrößerung 200 Prozent, Offline mit Zwischenspeicher, kein horizontaler Überlauf | Playwright, manuell auf echten Geräten |
| Barrierefreiheit | Automatische Prüfung (axe) auf jeder Seite, Kontrastwerte der Token-Paare, manueller Screenreader-Durchgang | Playwright mit axe, manuell |
| Performance | Lighthouse gegen den gebauten Container (Mobil und Desktop) | `lighthouse-lokal` |
| Visuelles | Screenshots Desktop 1440 mal 900 und Mobil 390 mal 844 als Dokumentation | Screenshot-Skript des Website-Workflows |

Testdaten: Ein fester Satz von Ensemble-Beispielen (Ostlage, Westlage, Grenzfall, Umstelltag) und eine Beobachtungsreihe mit Lücken und Wechseln, in `jobs/tests/fixtures/`. Keine Tests gegen die echten externen APIs in der CI, nur ein manueller Smoke-Test.

## 15. Risiken und Gegenmaßnahmen

| Risiko | Auswirkung | Gegenmaßnahme |
|---|---|---|
| Keine maschinenlesbare Quelle für Beobachtungen | Historie und Bewertung fehlen | Quellenleiter (Abschnitt 3), METAR-basiertes `wind_estimate` als gekennzeichnete Notlösung, beim Betreiber um Erlaubnis oder Daten bitten |
| Nutzungsbedingungen verbieten Scraping | Rechtsrisiko | Vorher prüfen, Erlaubnis einholen, alternative Quelle |
| Open-Meteo-Limits oder kommerzielle Einordnung | Ausfall oder Kosten | Wenige gebündelte Abrufe, Abo erwägen, Quellenangabe |
| Modelländerungen (Mitgliederzahl, Namen, Horizonte) | Sprünge in der Wahrscheinlichkeit | Gewichtsrampen, Warnung im JobRun, Konfigurationsversion |
| Überanpassung der Parameter | Scheingenauigkeit | Wenige Parameter, zeitliche Validierung, Konfidenzintervalle, keine automatische Übernahme |
| Zu wenige Daten für Aussagen nach Vorlaufzeit | Irreführende Güte | Mindestzahl Vergleiche, "vorläufig"-Kennzeichnung, Leerzustand |
| Falsche Annahme zur Schwelle (5 Knoten) | Systematische Abweichung | Kalibrierung Stufe 1 gegen Beobachtung, Fachquellen, Gegenprobe mit Umwelthaus |
| Nachtfenster uneindeutig | Verzerrte Statistik | Nacht getrennt ausweisen, `gap` statt "West" |
| Zeitumstellung | Falsche Fensterzuordnung | Eine Implementierung im Backend, feste Testdaten |
| Schema-Drift zwischen API und Frontend | Laufzeitfehler | Generierung, CI-Check, Schemaversion in jeder Antwort |
| Produktive API wird durch Fehler beeinträchtigt | Ausfall anderer Dienste | Eigener Blueprint, Rate-Limit, Branch-Arbeit, keine Pushes ohne Freigabe, Migrationen nur nach Sicherung und Freigabe |
| Datensammler laufen spät an | Verlorene Ensemble-Archive (nicht nachholbar) | Reihenfolge in Abschnitt 16, Forecast-Archiv so früh wie möglich |
| Ausfall eines Jobs bleibt unbemerkt | Lücken in der Historie | JobRun, Frische-Wächter, Statusseite |
| Nutzer verstehen Prozentwerte falsch | Fehlentscheidungen | Klartextklassen, Haftungshinweis, Methodikseite, Unsicherheitstrenner |
| Farbwahl wirkt schwach (Lindgrün auf Weiß) | Lesbarkeit | Dunkle Schrift auf Flächen, Muster und Buchstaben, Kontrastprüfung |

## 16. Reihenfolge und Phasen

Aufwände sind grobe Größenordnungen (S = Stunden bis 1 Tag, M = wenige Tage, L = rund eine Woche).

| Phase | Inhalt | Ergebnis (Definition of Done) | Aufwand |
|---|---|---|---|
| 0 | Bestehende API weiter sichten (Auth, Fehlerformat, Migrationsmechanismus, Tests), Datenquellen-Recherche (Abschnitt 3), offene Punkte (Abschnitt 18) klären | `docs/api-konventionen.md`, `docs/datenquellen.md`, Entscheidungsprotokoll aktualisiert, Rückfragen beantwortet | M |
| 1 | `$defs` und Schemas aller Entitäten schreiben, Beispieldaten, Konfigurationsschema | Schemas in `schemas/betriebsrichtung/`, Beispiele validieren | M |
| 2 | DDL-Generator, Migrationen, Typ- und Modellgenerierung, CI-Check | Migrationsdatei erzeugt (noch nicht ausgeführt), TS-Typen und Pydantic-Modelle erzeugt, CI schlägt bei Abweichung an | M |
| 3 | API-Schreibendpunkte mit Validierung (nur `ingest`), Migration nach Freigabe auf Entwicklungs- und dann Produktionsdatenbank | Idempotentes Schreiben getestet | M |
| 4 | **Observation-Logger** (Historie beginnt zu laufen) und METAR-Erfassung; **Forecast-Job in einfacher Form** mit Roh-Archiv (Archiv beginnt zu laufen); `JobRun` und Frische-Wächter | Beide Jobs laufen als CronJobs auf Staging-Schreibweg, Daten sammeln sich | L |
| 5 | Backfill gemäß gewählter Quelle, `SlotActual`-Job, Kalibrierung Stufe 1 gegen Beobachtung | Historie mit Quellenkennzeichnung, erste Parameter belegt | L |
| 6 | Forecast-Logik vollständig (Zustandsautomat, Gewichte, Rampen), danach Evaluation-Job und Baselines, `skill_horizon_days` | Nachvollziehbare Wahrscheinlichkeiten für 14 Tage, Auswertung nach Vorlaufzeit | L |
| 7 | API-Lesendpunkte (`timeline`, `slots`, `stats`, `evaluation`, `status`, `current`) mit Caching | Alle Lesewege mit Tests, Antworten gegen Schema validiert | M |
| 8 | Frontend-Gerüst: Vite, Tailwind-Tokens, shadcn-vue, Router, API-Client, Layout, 404, Docker, nginx, CI, Staging-Deploy | Leere App auf Staging erreichbar, BugDrop nur dort | M |
| 9 | Frontend Zeitachse mit Detail (Zukunft und Vergangenheit), Zustände, Barrierefreiheit, vollständiger Mobile-Komfort nach 10k | Hauptansicht abgenommen auf echtem iPhone und Android, einhändig bedienbar | L |
| 10 | Statistik und Prognosegüte, Methodik, Status, Rechtstexte | Alle Seiten vorhanden | L |
| 11 | Kalibrierung Stufe 2 (sobald genug Daten), Feinschliff, Lighthouse, Screenshots, Produktion aufsetzen | Abnahmekriterien erfüllt | M |

Hinweise:

- Phase 4 wird bewusst **vor** dem Frontend gebaut. Beobachtungen und Prognosen lassen sich nicht nachträglich erzeugen (zumindest nicht für Ensembles), jede Woche Verzögerung fehlt später in der Auswertung.
- Phasen 8 und 9 können parallel zu 5 und 6 laufen, sobald Phase 7 stabile Antworten liefert. Bis dahin entwickelt das Frontend gegen feste Beispielantworten (die Fixtures aus 14), die gegen das Schema validiert werden.
- Vor Phase 9: Kurzer Designprototyp (Pencil-Entwurf oder Skizze) der Zeitachse mit Mobil- und Desktop-Variante, Abnahme durch den Auftraggeber. Optional die Designregeln mit dem Skill `ui-ux-pro-max` als `design-system/MASTER.md` festhalten (die Standardpalette und Schriften des Werkzeugs werden dabei durch die Projektfarben und Inter ersetzt, übernommen werden Stil "Heatmap" und die Diagramm- und UX-Regeln).

## 17. Abnahmekriterien

- Schemas in der API sind die einzige Quelle, Migrationen, Typen und Modelle werden daraus erzeugt, der CI-Check schlägt bei Abweichungen an.
- Jobs laufen ohne manuelles Zutun, sind idempotent, und Ausfälle von Quellen sind sichtbar (Statusseite, E-Mail-Alarm, Lücke statt "West").
- Für die nächsten 14 Tage liegen nachvollziehbare Wahrscheinlichkeiten pro Zeitfenster vor, in den ersten 3 bis 5 Tagen überwiegend im Einklang mit der Umwelthaus-Prognose (messbar als Übereinstimmungsrate, Zielwert in Phase 0 festlegen).
- Die Historie zeigt tatsächliche Betriebsrichtungen mit Quelle, geschätzte Daten sind gekennzeichnet (Muster, Legende, Datenbasis in der Statistik).
- Die Prognosegüte nach Vorlaufzeit ist abrufbar und mit den Baselines (West, Klimatologie, Persistenz) verglichen, mit Konfidenzintervallen und Kennzeichnung "vorläufig" bei geringer Datenmenge.
- Zeitumstellung ist getestet (Termine aus 4a), alle Parameter der Logik sind konfigurierbar und dokumentiert.
- Das Frontend ist auf dem Handy **bestmöglich bedienbar** (Abschnitt 10k): einhändig nutzbar, Prüfbreiten 320, 360, 375 Pixel, Touch-Ziele mindestens 2,75 rem, kein Seitwärtsscrollen, Sheets schließen per Wischen und Zurück-Taste, Textvergrößerung bis 200 Prozent ohne Defekte, zuletzt geladene Daten erscheinen sofort, mobile Abnahme auf echtem iPhone und Android bestanden.
- Barrierefreiheit: Keine Verstöße in der automatischen Prüfung, Kontrast AA für Text und Bedienelemente, vollständige Tastaturbedienung der Zeitachse, Screenreader-Durchgang ohne Blocker, Farbe nie alleiniger Informationsträger.
- Lighthouse gegen den Produktions-Container: Barrierefreiheit 100, Best Practices und SEO hoch, Performance mobil im grünen Bereich, kein `NO_LCP`.
- Staging und Produktion getrennt, BugDrop nur auf Staging (am Quelltext der Produktion geprüft), eigene 404-Seite vorhanden, Datenschutz und Impressum vorhanden, Version im Fuß, `CHANGELOG.md` gepflegt.
- Dokumentation in `docs/` vollständig: Datenquellen, Konfiguration (jeder Parameter mit Bedeutung und Standardwert), Methodik, Betrieb (Jobs, Alarme, Wiederherstellung), Frontend (Utility-Klassen, Tokens), API-Konventionen.

## 18. Offene Punkte, die der Agent klären oder zurückmelden soll

Mit Empfehlung als Standard, falls keine Antwort kommt. Eine Antwort des Auftraggebers hat Vorrang.

| Nr. | Frage | Empfehlung |
|---|---|---|
| 1 | Welche Quelle liefert verlässlich Beobachtungen und Historie (Ergebnis aus Abschnitt 3)? | Teilweise beantwortet (`docs/datenquellen.md`): Wind-Beobachtung über METAR EDDF (aviationweather.gov) als Primärquelle, Testabruf noch offen. Aktuelle Betriebsrichtung: Umwelthaus ohne Schnittstelle, nicht scrapen. Netzwerk-Check der Umwelthaus-Seite offen |
| 2 | Gibt es in der API bereits ein Schema-Ablagekonzept und einen Migrationsmechanismus? | Beantwortet (`docs/api-konventionen.md`): Schemas als Dateien, Migrationen von Hand ohne Runner und ohne Migrationstabelle, Schreib-Token fehlt und wird neu eingeführt |
| 3 | Auflösung der Historie: Zeitfenster, Stunden oder nur Tage? | Rohdaten als Wechselereignisse (zeitgenau), Anzeige und Statistik je Zeitfenster, Tageswerte abgeleitet |
| 4 | Nur privat nutzbar oder später öffentlich? | Öffentlich und indexierbar, Stand 17.10.2026 (Entscheidung Tobias). Impressum und Datenschutz stehen. Die Architektur ist öffentlich lesbar |
| 5 | Domain und Name der App | `betriebsrichtung.tobeworks.de` (Staging), Produktionsdomain offen |
| 6 | Farbzuordnung West/Ost wie vorgeschlagen? | Ja, mit dunkler Schrift, Buchstaben und Mustern |
| 7 | Definition "Fenster ist Ost": Mehrheit der Zeit (über 50 Prozent)? | Ja, zusätzlich `expected_east_share` ausliefern |
| 8 | Umgang mit dem Nachtfenster | Ausweisen, getrennt bewerten, bei fehlenden Daten `gap` |
| 9 | Jobs als Kubernetes-CronJobs oder Cron auf dem vorhandenen Server? | Kubernetes-CronJobs |
| 10 | Dürfen Daten von Umwelthaus/Fraport automatisiert abgerufen und gespeichert werden? | Entscheidung Tobias, 17.10.2026: Was öffentlich abrufbar ist, darf abgefragt werden, eine Anfrage beim Betreiber ist nicht nötig. Umwelthaus ist bisher nicht angebunden (`docs/datenquellen.md`). Fraport noch nicht geprüft |
| 11 | Open-Meteo: freie Nutzung zulässig oder Abo mit API-Key? | Geklärt, 17.10.2026: Die App ist nichtkommerziell, also gilt die freie API (CC BY 4.0, kein Key). Bedingung: keine Werbung, kein Abo, Quelle nennen. Ändert sich das, braucht es einen bezahlten Tarif |
| 12 | Ansprache in Texten (neutral, du oder Sie) | Sachlich ohne direkte Anrede |
| 13 | Zugriff auf die API von außen: Lesen offen oder mit Token? | Lesen offen, Schreiben nur mit Token, Rate-Limit |
| 14 | Wo liegt das Roh-Archiv der Ensemble-Läufe (Persistent Volume oder Objektspeicher)? | Persistent Volume im Cluster, Sicherung einbeziehen |
| 15 | Wer erhält Alarmmails und wie oft? | Betreiber, einmal je Störung mit Entwarnung |
| 16 | Wochenraster oder Liste als Desktop-Ansicht der Zeitachse? | Prototyp beider Varianten in Phase 9, Empfehlung Wochenraster |
| 17 | Logo, Name und Favicon | Vom Auftraggeber, bis dahin Platzhalter mit Namen "Betriebsrichtung" |

## 19. Entscheidungsprotokoll dieser Fassung

| Nr. | Entscheidung | Begründung |
|---|---|---|
| D1 | Frontend ist Vite-SPA mit Vue, kein Astro | Vorgabe des Auftraggebers, App ist rein clientseitig datengetrieben |
| D2 | shadcn-vue bleibt gesetzt, wird auf eigene Tokens gemappt | Vorgabe im Auftrag, widerspricht der Dashboard-Regel des Website-Workflows bewusst nicht, weil dort die Tobeworks-CI gilt und hier eigene Farben |
| D3 | Fensterzuordnung und Zeitzonenlogik nur im Backend | Eine Implementierung, weniger Fehler bei der Zeitumstellung |
| D4 | Zeitachsen-Endpunkt `GET /timeline` | Frontend bleibt einfach, Logik zentral und testbar |
| D5 | Prognoseziel ist "Fenster ist Ost" bei über 50 Prozent Zeitanteil | Eindeutig, bewertbar, passt zum Auftrag |
| D6 | Zwei-Stufen-Kalibrierung | Ensemble-Archive fehlen am Anfang, Entscheidungsmodell lässt sich schon mit Beobachtungswind kalibrieren |
| D7 | Baselines: West, Klimatologie, Persistenz | "Immer West" allein ist für kurze Vorlaufzeiten zu schwach als Maßstab |
| D8 | Prognosezelle als geteilter Balken statt Farbverlauf | Vermeidet trübe Mischfarbe, besser für Farbenblindheit |
| D9 | Datensammler vor Frontend | Archive können nicht nachträglich erzeugt werden |
| D10 | Kein Lenis, kein Animate-on-Scroll, kein axios | Datenanwendung braucht sie nicht, weniger Abhängigkeiten |
| D11 | Utility-Übersicht in `docs/frontend.md` statt Kommentarblock | Vorgabe "keine Kommentare im Code" geht vor |
| D12 | Roh-Archiv der Ensemble-Läufe außerhalb von MySQL | Mengen sind klein, MySQL bleibt schlank, spätere Neuberechnung möglich |
| D13 | Staging und Produktion teilen eine Daten-Pipeline | Doppelte Jobs würden Daten verdoppeln und die Quelllimits belasten |
| D14 | Kein Blueprint, Resource-Klassen in `api_betriebsrichtung.py`, registriert in `server.py` | So sind alle bestehenden Module gebaut (Phase 0, `docs/api-konventionen.md`) |
| D15 | Schreibzugriffe mit eigenem Token (`BETRIEBSRICHTUNG_INGEST_TOKEN`), nicht mit `login_required` | `login_required` lässt jede Benutzer-JWT durch, Jobs brauchen einen eigenen Schlüssel |
| D16 | Fehlerformat `{"status": 0, "error": ..., "code": ...}` | Bestand nutzt `status` und `error`, das Feld `code` ist neu und additiv |
| D17 | Paginierung über `limit` (Standard 100, Höchstwert 500) und `after_id`, kein Offset | Offset verschiebt bei wachsenden Tabellen Zeilen |
| D18 | Wind-Beobachtung über METAR EDDF als Primärquelle, Umwelthaus nicht scrapen | METAR hat offene Limits (100 pro Minute) und dokumentierte Abfrage. Umwelthaus liefert keine Schnittstelle und keine Nutzungsbedingungen |
| D19 | Modell-IDs in `forecast.json`: `ecmwf_ifs025`, `gfs025` bestätigt, `icon_global` ersetzen durch `icon_seamless_eps` (bestätigt) | Testabruf der Open-Meteo Ensemble API am 16.10.2026 |
| D20 | Logging mit Standardbibliothek `logging` als JSON, nicht `print()` | Bestand hat rund 48 `print()`-Aufrufe und kein Logging, die neuen Module brauchen Korrelations-IDs |
| D21 | Neue Migrationen mit Datum, Nummer und Tabelle `schema_migrations` | Bestand hat keine Nummerierung und keinen Runner, die Kette muss nachvollziehbar sein |
| D22 | Schema-Version in jeder Entitätsdatei als Annotation `x-schema-version`, in Antworten als Feld `schema` | Entitäten sind Tabellenzeilen, ein Pflichtfeld `schema` dort wäre eine Spalte ohne Nutzen |
| D23 | DB-Enum-Werte als `VARCHAR`, nicht als `ENUM` | Ein neuer Wert braucht dann keinen Tabellen-Umbau |
| D24 | Pydantic-Modelle mit `--collapse-root-models`, `if`/`then`-Regeln nur im JSON-Schema | Der Generator übersetzt bedingte Regeln nicht, die API prüft mit jsonschema |
| D25 | Generator-Kopie mit Punkt-losen Dateinamen für Pydantic | `common.schema.json` führt sonst zu falschen relativen Imports |
| D26 | Ingest-Endpunkte zusätzlich `forecast-configs` und `wind-observations` | Ohne Konfigurationsversion schlägt der Fremdschlüssel des Laufs fehl, Winddaten sind in Plan Abschnitt 9 vorgesehen, fehlen aber in Abschnitt 8 |
| D27 | Idempotenz über Unique-Schlüssel je Tabelle, erster Wert gewinnt | observation und wind_observation (Zeit, Quelle), source_heartbeat (Quelle, Zeit), forecast_run (Datum, Lauf-Nummer), forecast (Lauf, Fensterbeginn, Modell), job_run (Korrelations-ID, aktualisiert Status), forecast_evaluation (Berechnung, Fenster, Zeitraum, Konfiguration, Klasse, Tag) |
| D28 | `lead_day` ist 0 bei Klassenwerten statt NULL | MySQL erlaubt mehrere NULL in Unique-Schlüsseln, die Idempotenz griffe sonst bei Klassenwerten nicht |
| D29 | Observation-Logger in Phase 4 ist ein METAR-Winddaten-Logger, keine Richtungsquelle | Umwelthaus ist bisher nicht angebunden (Abruf wäre erlaubt, Entscheidung 17.10.2026), ADS-B und D-ATIS sind ungeprüft (`docs/datenquellen.md`) |
| D30 | `init_time` ist der Abrufzeitpunkt, nicht der Modelllauf | Die Ensemble-Antwort von Open-Meteo liefert den Initialisierungszeitpunkt nicht |
| D31 | Rohdaten-Archiv erst nach angelegtem Lauf, je Lauf eine Datei | Wiederholte Aufrufe würden sonst Rohdaten eines vorhandenen Laufs überschreiben |
| D32 | Zeitachse liest `slot_actual` für vergangene Fenster und den neuesten `blend`-Lauf für zukünftige, Fenster ohne Wahrheit fehlen in der Antwort | Der Slot-Job (Phase 5) ist noch nicht gebaut, Beobachtungen für Richtungen fehlen ohnehin, Lücken werden nicht als West ausgegeben |
| D33 | Lesen ohne Token, Antwort mit `Cache-Control: public, max-age=300` | Plan Abschnitt 8, Zwischenspeicher für die Anzeige |
