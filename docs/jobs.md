# Jobs (Phase 4)

Stand: 2026-10-16. Paket `jobs/src/betriebsrichtung_jobs`, nur Standardbibliothek plus Pydantic für die Konfigurationsprüfung. Die Jobs schreiben ausschließlich über die Ingest-Endpunkte der API (`docs/api-konventionen.md`, Plan Abschnitt 8).

## Befehle

```
python -m betriebsrichtung_jobs metar [--trockenlauf]
python -m betriebsrichtung_jobs forecast --lauf-nummer 1-99 [--archiv DIR] [--trockenlauf]
```

- `metar`: holt die METAR-Meldungen von EDDF der letzten 24 Stunden, speichert sie als Winddaten (`wind-observations`). Daraus rechnet die API die geschätzte Wahrheit (siehe unten).
- `forecast`: holt für jedes Modell in `jobs/config/forecast.json` das 14-Tage-Ensemble, rechnet Ostwahrscheinlichkeiten je Zeitfenster und schreibt den Lauf atomar (`forecast-configs`, `forecast-runs`).
- `--trockenlauf`: rechnet und gibt aus, schreibt nichts und archiviert nichts.
- Ein Lauf protokolliert sich am Ende mit einem Eintrag in `job-runs`.

## CronJob auf dem Cluster auslösen

Die Manifeste liegen im Netcup-Repo (`apps/betriebsrichtung-jobs/cronjobs.yaml`). Zeiten in UTC: `metar` zur Minute 27 und 57 (die METAR-Meldungen von EDDF erscheinen um :20 und :50, so liegen sie wenige Minuten später in der Datenbank), `forecast-1` 04:30, `forecast-2` 10:30, `forecast-3` 16:30. Die CronJobs nutzen `ghcr.io/tobeworks/betriebsrichtung-jobs:latest` mit `imagePullPolicy: Always`, jeder Lauf zieht also das aktuelle Image.

```bash
kubectl create job --from=cronjob/betriebsrichtung-forecast-3 forecast-manuell -n betriebsrichtung
kubectl logs -n betriebsrichtung job/forecast-manuell -f
kubectl delete job forecast-manuell -n betriebsrichtung
```

Eine Lauf-Nummer wird pro Tag nur einmal angenommen. Hat der geplante Lauf heute schon geschrieben, meldet der manuelle Lauf `vorhanden` und ändert nichts. Das lokale Starten steht im [README](../README.md#run-the-jobs-locally).

## Umgebung

| Variable | Bedeutung |
|---|---|
| `BETRIEBSRICHTUNG_API_URL` | Basis der API, zum Beispiel `https://…/betriebsrichtung/v1` |
| `BETRIEBSRICHTUNG_INGEST_TOKEN` | Schreibtoken, nur aus dem Secret-Speicher des Clusters |
| `BETRIEBSRICHTUNG_ARCHIV_DIR` | Verzeichnis für die Rohdaten (Persistent Volume), optional |
| `BETRIEBSRICHTUNG_CONFIG` | Alternativer Pfad zur Konfiguration, optional |

## Lauf-Nummer und Idempotenz

Die Lauf-Nummer gehört zum Idempotenzschlüssel (lokaler Tag plus Nummer). Ein zweiter Aufruf mit derselben Nummer am selben Tag antwortet mit `vorhanden` und schreibt nichts. Vorschlag für die CronJobs: drei Läufe am Tag mit den Nummern 1 bis 3, zeitlich so verteilt, dass jeder Lauf nach der Verfügbarkeit der Modelle liegt (Startwert nach Plan Abschnitt 9). `metar` läuft stündlich. `concurrencyPolicy: Forbid`, Zeitzone UTC.

## Verhalten bei Ausfällen

- Ein Modell, das nicht abrufbar ist, lässt den Lauf auf `partial` gehen. Die übrigen Modelle werden gespeichert, die Gewichte der Mischung werden auf die vorhandenen Modelle verteilt.
- Fallen alle Modelle aus, entsteht kein Lauf. Das Protokoll meldet `failed` mit der Fehlermeldung.
- Eine Stunde, in der ein Wert fehlt, zählt nicht. Ein Zeitfenster mit weniger als 70 Prozent Abdeckung wird für dieses Modell nicht ausgewertet. Es entsteht dann keine Zeile, nicht eine Zeile mit West.
- Nur Fenster, die noch nicht begonnen haben, bekommen eine Prognose. Die Vorlaufzeit ist nie negativ.

## Rohdaten-Archiv

Nach einem neu angelegten Lauf (`angelegt`) wird die Roh-Mitgliederreihe jedes Modells gespeichert: `DIR/JJJJ-MM-TT/lauf-NN.json.gz`. Wiederholte Aufrufe, die `vorhanden` melden, schreiben kein Archiv. Das Archiv ist die Voraussetzung, um das Entscheidungsmodell später mit anderen Parametern neu zu rechnen (Plan Abschnitt 9).

## Entscheidungsmodell (Konfiguration Version 2)

Der geglättete Rückenwind für West wird je Stunde und Ensemble-Mitglied linear auf einen Ostanteil abgebildet: bis `west_back_tailwind_kn` (0 kn) gilt West, ab `east_on_tailwind_kn` (4 kn) gilt Ost, dazwischen steigt der Anteil. Das Fenster bekommt den Mittelwert über Stunden und Mitglieder. Grund: Die DFS entscheidet im Bereich um 0 bis 4 kn nicht eindeutig (Boden- und Höhenwind, Pilotenmeldungen), das Ensemble kann diese Unsicherheit nicht abbilden. Eine harte Schwelle gab am 17.10.2026 bei Nordwind 0 % Ost, geflogen wurde Ost.

Die Bandgrenzen sind vorläufig. Sie wurden gegen die 15 Fenster der Umwelthaus-Prognose vom 17.10.2026 abgeglichen (Zustände 1, 2, 3 dort: West, Wechsel möglich, Ost), nicht gegen beobachtete Richtungen. `min_dwell_hours` und `slot_majority` bleiben in der Konfiguration, weil das Schema sie verlangt, sie werden nicht mehr ausgewertet.

## Geschätzte Wahrheit aus Messwind (Rechnung in der API)

Solange keine Quelle für die geflogene Richtung angebunden ist, schätzt die **API** beim Lesen der Zeitachse die Wahrheit begonnener und vergangener Fenster aus den gespeicherten Winddaten (`wind_observation`, die der `metar`-Job liefert). Der Job selbst schreibt dafür nichts, es braucht keinen Nachtrag, und jede Datenbank mit Winddaten zeigt sie sofort. Die Zeitachse trennt strikt: Zukünftige Fenster zeigen die Prognose (`status forecast`), abgelaufene die Wahrheit (`slot_actual` mit `quality observed` geht vor, sonst die Schätzung mit `status estimated`), das laufende Fenster die Mischung aus beidem (`status running`). Ohne Wahrheit zeigt ein abgelaufenes Fenster "keine Daten", niemals eine Prognose.

- **Code:** `api/betriebsrichtung_schaetzung.py` im API-Repo. Die Parameter (`east_on_tailwind_kn`, `smoothing_hours`, `min_dwell_hours`, `slot_majority`, Achse) kommen aus der zuletzt gespeicherten Konfiguration, also aus derselben Quelle wie die Prognose.
- **Rechnung:** Je UTC-Stunde der mittlere Rückenwind für West (Meldungen ohne Richtung, VRB, zählen als 0), geglättet. Daraus ein Zustand je Stunde mit Hysterese: Die laufende Richtung bleibt, bis der Rückenwind für sie `east_on_tailwind_kn` überschreitet, in beide Richtungen. Bei Flaute bleibt also die Richtung stehen, so wie die DFS sie hält. `east_share` ist der Ost-Anteil der Stunden im Fenster, `truth` Ost ab mehr als `slot_majority`.
- **Abdeckung:** Für ein abgelaufenes Fenster brauchen mindestens 70 Prozent der Stunden Meldungen, sonst entsteht keine Zeile.
- **Laufendes Fenster:** Es zeigt `status running` und mischt zwei Teile zeitgewichtet. Der bekannte Teil reicht bis zur letzten Stunde mit Meldung (nicht bis jetzt, die Daten kommen mit Verzug in die Datenbank) und wird wie oben geschätzt (`east_actual`, Anteil am Fenster `actual_share`). Der Rest kommt aus der zuletzt vor Beginn gerechneten Prognose (`p_east_rest`), ohne Prognose gilt der Stand des bekannten Teils. `latest_direction` ist die geschätzte Richtung der letzten Stunde mit Meldung und speist die Kachel "Aktuell". Ohne Winddaten bleibt das laufende Fenster eine reine Prognose, ohne beides fehlt es.
- **Anzeige:** Das Frontend zeigt die Schätzung als Anteil ("geschätzt: Ost"), kräftig gefärbt. Prognosen sind blass und gestrichelt ("Prognose: ...").
- **Prüfung:** Gegen die Umwelthaus-Anzeige vom 17.10.2026 stimmen alle Fenster seit dem 13.10. bis auf den Beginn von Ost am 17.10.: Die DFS wechselte um 11:16 Uhr bei etwa 3 kn Rückenwind (Nordwind), die Rechnung erst bei mehr als 4 kn am Nachmittag.
- **Grenze:** Die Schätzung nutzt Wind und Hysterese, aber nicht alles, was die DFS berücksichtigt (Höhenwind, Pilotenmeldungen, Bahn 18). Sie taugt auch nicht, um die Prognose zu bewerten, weil sie vom selben Wind abhängt.

## Bekannte Grenzen (ehrlich)

- **Keine Richtungsbeobachtung.** Eine Quelle für die geflogene Richtung ist nicht angebunden (Umwelthaus dürfte abgefragt werden, siehe `docs/datenquellen.md`; ADS-B und D-ATIS sind nicht geprüft). Der Observation-Logger ist deshalb in dieser Phase ein Winddaten-Logger (METAR). Die Anfangszustände der Automaten werden aus dem ersten Wind bestimmt, nicht aus einer beobachteten Richtung. Sobald eine Richtungsquelle angebunden ist, sollte der Anfangszustand daraus kommen (Plan 4b, Punkt 5).
- **Initialisierungszeit.** Die Ensemble-Antwort von Open-Meteo enthält den Initialisierungszeitpunkt des Modelllaufs nicht. Als `init_time` wird der Abrufzeitpunkt gespeichert, nicht der Modelllauf selbst.
- **Keine Kalibrierung.** Die Ausgabe ist roh (`calibrated: false`), Stufe 1 und 2 (Plan 4d) fehlen.
- **Kein Frische-Wächter, kein Slot-Job, kein Backfill, kein Evaluation-Job.** Das sind Phasen 5 und 6.
- **Keine Heartbeats für METAR.** Die Quelle `metar` gehört nicht zu den Richtungsquellen, Lebenszeichen werden nur dort geschrieben. Der Lauf des Jobs steht dafür in `job-runs`.
- **Glättung über Lücken.** Fehlende Stunden werden vor der Glättung entfernt, die Glättung läuft also über die verbleibende Reihe, nicht über die Zeit.
- **Kein Container und kein CronJob.** Die Manifeste gehören ins Netcup-Repo (Plan Abschnitt 11) und sind hier nicht enthalten.

## Tests

```
python -m pytest jobs/tests
```

Die Vertragstests (`test_api_vertrag.py`) prüfen die erzeugten Zeilen gegen die Schemas im API-Repo daneben (`SCHEMA_DIR`). Fehlt das Repo, werden sie übersprungen.
