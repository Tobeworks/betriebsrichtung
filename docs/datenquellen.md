# Datenquellen (Phase 0)

Stand: 2026-10-16. Jeder Steckbrief nennt, was geprüft wurde und wie. Angaben aus der Doku gelten nur als geprüft, wenn ein Testabruf oder der Wortlaut der Seite vorliegt. Offene Punkte stehen am Ende jedes Abschnitts.

## Entscheidungsregel (Plan Abschnitt 3)

Echte Beobachtung vor Ableitung aus Flugdaten vor Windschätzung. Jede Stufe wird nur genutzt, wenn die höhere nichts liefert, und im Datensatz bleibt die Stufe sichtbar.

## Übersicht

| Zweck | Quelle | Stand | Entscheidung |
|---|---|---|---|
| Ensemble-Wind (Prognose) | Open-Meteo Ensemble API | Testabruf erfolgreich | Verwenden, Lizenz klären (siehe unten) |
| Aktuelle Betriebsrichtung | Umwelthaus | Keine maschinenlesbare Schnittstelle gefunden | Nicht scrapen, Erlaubnis beim Betreiber erfragen |
| Wind am Flughafen (Beobachtung) | METAR EDDF über aviationweather.gov | Doku geprüft, kein Testabruf | Primärquelle für Wind-Beobachtung |
| Historischer Wind (Archiv) | IEM ASOS (METAR-Archiv) | Doku geprüft, EDDF-Abdeckung offen | Für Backfill prüfen |
| Gegenprobe Wind | DWD Frankfurt Flughafen, CC BY 4.0 | Lizenz geprüft | Gegenprobe, Quellenvermerk nötig |
| Aktuelle Richtung (Alternative) | D-ATIS EDDF, ADS-B | Nicht geprüft | Offen |
| Notlösung Statistik | Open-Meteo Archiv (Reanalyse) | Nicht geprüft | Offen, Lizenz wie Open-Meteo |

## 1. Open-Meteo Ensemble API

- **Endpunkt:** `https://ensemble-api.open-meteo.com/v1/ensemble`.
- **Testabruf (16.10.2026):** Koordinaten 50.04 N, 8.56 E, `hourly=wind_speed_10m,wind_direction_10m`, `wind_speed_unit=kn`, `timezone=UTC`, `forecast_days=1`.
  - `models=ecmwf_ifs025`: gültig, 24 Stunden. Spalten `wind_speed_10m` (Kontrolllauf ohne Suffix) und `wind_speed_10m_member01` bis `_member50`, also 51 Läufe.
  - `models=gfs025`: gültig, 30 nummerierte Spalten plus Kontrolllauf, also 31 Läufe.
  - `models=icon_seamless_eps`: gültig, 39 nummerierte Spalten plus Kontrolllauf, also 40 Läufe (ICON-Kombination).
  - Einheit `kn` wird ausgegeben, `timezone=UTC` liefert `GMT` mit `utc_offset_seconds` 0.
- **Modelle laut Doku-Tabelle** (Horizont, Mitglieder):
  - DWD ICON-D2-EPS: 2 Tage, 20 Mitglieder. ICON-EU-EPS: 5 Tage, 40. ICON-EPS global: 7,5 Tage, 40.
  - NOAA GFS Ensemble 0,25 Grad: 10 Tage, 31. Der Plan nannte 16 Tage, das ist falsch.
  - ECMWF IFS 0,25 Grad: 15 Tage, 51 Läufe inklusive Kontrolllauf (im Testabruf bestätigt). Passt zum Plan.
  - CMC GEM: 16 Tage, 21 Mitglieder (39 montags und donnerstags).
- **Platzhalter in `forecast.json` (Plan 4e):** `ecmwf_ifs025` und `gfs025` sind bestätigt. `icon_global` ist nicht bestätigt, geprüft gültig ist `icon_seamless_eps`. Im Plan ersetzen.
- **Wind:** `wind_speed_10m` und `wind_direction_10m` stündlich, `wind_gusts_10m` als Maximum der Stunde. `wind_speed_100m` ist vorhanden.
- **Historie:** Ensemble-Daten vergangener Läufe gibt es über diesen Endpunkt nur für bis zu 3 Tage (`past_days`). Die Doku nennt kein `previous_runs` für Ensembles. Für Stufe 2 der Kalibrierung (Plan 4d) heißt das: **Hindcast aus Open-Meteo ist für Ensembles nicht belegt.** Das Archiv der eigenen Läufe (Plan 9, Rohdaten-Archiv) ist die Voraussetzung. Das bestätigt Entscheidung D9 (Datensammler vor Frontend).
- **Lizenz und Nutzungsbedingungen (Seite `open-meteo.com/en/terms`):**
  - Freie API nur für nichtkommerzielle Zwecke. Beispiele: private oder gemeinnützige Seiten ohne Abos oder Werbung.
  - Kommerziell sind Websites oder Apps mit Abos oder Werbung, Einbindung in kommerzielle Produkte oder Werbeaktionen.
  - Lizenz: CC BY 4.0 (Quellenvermerk). Kein API-Key im freien Tarif.
  - Limits: 600 Aufrufe pro Minute, 5 000 pro Stunde, 10 000 pro Tag, 300 000 pro Monat.
- **Entscheidung nötig (offene Frage 11 im Plan):** Die App gehört zu Tobeworks, einem Unternehmen. Eine öffentliche Seite unter diesem Namen ist wahrscheinlich kommerziell im Sinne der Bedingungen. Bis zur Klärung nur privater Betrieb oder Staging ohne öffentliche Werbung und ohne Abo. Für öffentlichen Betrieb ist ein bezahlter Tarif wahrscheinlich nötig. Diese Entscheidung trifft Tobias.
- **Abrufbudget:** Pro Forecast-Lauf je Modell eine Anfrage mit allen Mitgliedern und 14 Tagen, Modelle getrennt. Das bleibt weit unter 10 000 pro Tag.
- **Offen:** Modellliste über die Doku hinaus bestätigt (`icon_seamless_eps` getestet), Einzelmodell-IDs für ICON global und GEM noch nicht getestet.

## 2. Umwelthaus (aktuelle Betriebsrichtung und Prognose)

- **Seite:** `https://www.umwelthaus.org/fluglaerm/anwendungen-service/aktuelle-betriebsrichtung-und-prognose/`.
- **Geprüft:** Statischer Seiteninhalt (Abruf ohne Browser). Gefunden:
  - Richtungsanzeige als SVG-Grafik (`br25west.svg`) mit Text "BR 25 West, Betriebsrichtung seit 14. Okt., 23.51 Uhr". Wind als Text in Knoten.
  - Prognose in Blöcken 6 bis 14, 14 bis 22, 22 bis 6 Uhr. Das passt zu den Fenstern des Plans. Aktualisierung dreimal täglich.
  - Keine JSON-Daten, kein eingebettetes Datenobjekt, keine Endpunkt- oder Widget-URL, keine erkennbaren Skript-Quellen für die Diagramme.
  - Einziger Feed ist ein Seiten-RSS (`/rss/`), der laut Inhalt nicht die Prognose enthält.
  - Verweis auf einen Datendienst für automatische Steuerung über UNH, nur auf Anfrage.
- **Nicht geprüft (Lücke):** Der Netzwerk-Tab der Seite (XHR-Aufrufe beim Laden und beim Verschieben des Schiebereglers). Dafür war die Chrome-Erweiterung nicht verbunden (`tabs_context_mcp` meldete keine Verbindung). Das ist die einzige Stelle, die eine versteckte JSON-Schnittstelle belegen oder ausschließen könnte.
- **Nutzungsbedingungen:** Keine Lizenz oder Nutzungserlaubnis auf der Seite. Quellen werden genannt: DFS für die Betriebsrichtung, GFS-Modell, openweathermap.org für Bodenwind. Trägerin ist die gemeinnützige Umwelthaus GmbH.
- **Entscheidung:** Kein Scraping. Der Plan (Frage 10) sieht vor, bei fehlender Erlaubnis den Betreiber zu fragen. Die Anfrage ist eine Aufgabe für Tobias, nicht für den Agenten.
- **Entwurf der Anfrage (zur Freigabe):** Ob automatisierte Abrufe der Richtungsanzeige und der Prognose für eine nichtkommerzielle Informations-App erlaubt sind, und ob es eine Datenschnittstelle gibt.
- **Auch offen:** DFS als Quelle der Betriebsrichtung. Ob die DFS eine maschinenlesbare Information veröffentlicht, ist nicht geprüft.

## 3. METAR EDDF (Wind am Flughafen)

- **Quelle:** aviationweather.gov, Datenbereich `/api/data`.
- **Endpunkt (aus der Doku):** `https://aviationweather.gov/api/data/metar?ids=EDDF&format=json`. Formate: Rohtext, JSON, GeoJSON, CSV, XML, IWXXM.
- **Limits (aus der Doku):** 100 Anfragen pro Minute. Bis zu 400 Einträge pro Abfrage. HTTP 429 bei Überschreitung. Empfehlung für große Mengen: Cache-Dateien `metars.cache.csv.gz` oder `metars.cache.xml.gz`, aktualisiert jede Minute. Eigener User-Agent setzen.
- **Kosten und Schlüssel:** Die Doku nennt keinen Schlüssel, bestätigt aber auch nicht, dass der Dienst frei ist. Vor der Nutzung in der Produktion klären.
- **SPECI:** Ob Sonderberichte enthalten sind, ist nicht geprüft.
- **Nutzung:** Der Plan sieht stündlichen Abruf vor (Plan 9). Das liegt weit unter dem Limit.
- **Entscheidung:** Primärquelle für die Wind-Beobachtung am Flughafen. Sie liefert die Messung, auf der die Kalibrierung Stufe 1 aufsetzt. Die METAR enthält keine Betriebsrichtung. Die Richtung wird aus dem Wind abgeleitet (Plan 4b).
- **Offen:** Testabruf mit `ids=EDDF` und Prüfung der Felder (Windrichtung, Windstärke, Zeitstempel). Vor dem ersten Job nachholen.

## 4. IEM ASOS (historischer METAR-Wind)

- **Quelle:** Iowa Environmental Mesonet, ASOS-Download.
- **Geprüft (Seite `mesonet.agron.iastate.edu/request/download.phtml`):** Keine Lizenz und kein Hinweis zu automatischer Nutzung auf der Seite, nur ein Link auf einen Disclaimer. Keine festen Limits, nur Obergrenzen: ohne Station ein Tag, mit Station höchstens 1 000 Stationsjahre pro Anfrage. Die Doku sagt, dass wenig Qualitätskontrolle stattfindet.
- **EDDF:** Die Seite listet ein Netz "Germany ASOS". Ob EDDF darin enthalten ist und ab welchem Jahr die Daten reichen, ist nicht belegt. Nachprüfen im Formular (Netz "Germany ASOS" wählen).
- **Entscheidung:** Für den Backfill der Historie nutzbar, sofern EDDF abgedeckt ist. Vorher Disclaimer lesen und Datenabdeckung prüfen. Die Quelle bleibt in den Daten als eigener Kennwert sichtbar.

## 5. DWD Frankfurt/Main Flughafen (Gegenprobe)

- **Lizenz (geprüft über die DWD-Seite zu rechtlichen Hinweisen):** Geodaten und Geodatendienste dürfen unter CC BY 4.0 genutzt werden, mit Quellenvermerk. Kommerzielle Nutzung wird auf der Seite nicht erwähnt, CC BY 4.0 erlaubt sie grundsätzlich.
- **Nicht geprüft:** `opendata.dwd.de` ist auf der Seite nicht namentlich genannt. Der Nutzungsbedingungs-PDF-Link lieferte einen 404.
- **Bright Sky:** Ein Drittanbieter-Wrapper. Nicht geprüft, nur als Option erwähnt.
- **Entscheidung:** Gegenprobe für Stichproben der Windmessung, kein Pflichtbestandteil. Quellenvermerk im Impressum.

## 6. Aktuelle Richtung ohne Umwelthaus: D-ATIS und ADS-B

- **D-ATIS EDDF:** Nicht geprüft. Inoffizielle Aggregatoren wären nötig, Stabilität und Lizenz offen.
- **ADS-B (adsb.lol, OpenSky, airplanes.live):** Die Docs-Seite von adsb.lol leitet auf `api.adsb.lol` um. Der Abruf dieser Zielseite war in diesem Lauf nicht vorgesehen. Lizenz, Limits und historische Abfragen sind offen. Fraport und OpenSky-Historie brauchen oft ein Konto.
- **Nächster Schritt:** Nur angehen, wenn Umwelthaus nicht erlaubt und die METAR-Ableitung nicht reicht. Die Regel aus Plan 3 Punkt 4 gilt: nachts entsteht sonst "keine Daten", niemals "West".

## 7. Historische Richtung aus Behörden (Fraport, DFS, HLNUG)

- **Nicht geprüft.** Fraport-Verkehrszahlen, Fluglärmberichte und Anfragen nach dem Umweltinformationsgesetz sind Kandidaten. Sie wären nur für Stichproben sinnvoll, weil sie selten in Stundenauflösung vorliegen.
- **Offen für Phase 0:** Ein Informationsantrag an Fraport oder die DFS, falls Tobias das möchte.

## Offene Punkte aus diesem Lauf

1. Netzwerk-Tab der Umwelthaus-Seite prüfen (Chrome-Erweiterung nicht verbunden). Alternative ohne Browser: Entwicklertools in einem normalen Browser öffnen, Reiter Netzwerk, Filter "XHR" oder "Fetch", Seite neu laden, Schieberegler bewegen, und den Inhalt der Anfragen notieren.
2. Lizenzfrage Open-Meteo für öffentlichen Betrieb (Tobias).
3. Anfrage an Umwelthaus (Tobias, Entwurf oben).
4. Testabruf METAR EDDF und Feldprüfung.
5. Abdeckung EDDF in IEM ASOS.
6. Open-Meteo Archiv (Reanalyse) für die Notlösung Statistik: Endpunkt und Lizenz prüfen.
7. ADS-B-Lizenz und D-ATIS-Stabilität nur bei Bedarf.
