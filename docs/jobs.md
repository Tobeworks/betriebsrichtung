# Jobs (Phase 4)

Stand: 2026-10-16. Paket `jobs/src/betriebsrichtung_jobs`, nur Standardbibliothek plus Pydantic für die Konfigurationsprüfung. Die Jobs schreiben ausschließlich über die Ingest-Endpunkte der API (`docs/api-konventionen.md`, Plan Abschnitt 8).

## Befehle

```
python -m betriebsrichtung_jobs metar [--trockenlauf]
python -m betriebsrichtung_jobs forecast --lauf-nummer 1-99 [--archiv DIR] [--trockenlauf]
```

- `metar`: holt die METAR-Meldungen von EDDF der letzten 24 Stunden (`--stunden 1-168` für einen Nachtrag), speichert sie als Winddaten (`wind-observations`) und schätzt daraus die Wahrheit der begonnenen Fenster (`slot-actuals`, siehe unten).
- `forecast`: holt für jedes Modell in `jobs/config/forecast.json` das 14-Tage-Ensemble, rechnet Ostwahrscheinlichkeiten je Zeitfenster und schreibt den Lauf atomar (`forecast-configs`, `forecast-runs`).
- `--trockenlauf`: rechnet und gibt aus, schreibt nichts und archiviert nichts.
- Ein Lauf protokolliert sich am Ende mit einem Eintrag in `job-runs`.

## CronJob auf dem Cluster auslösen

Die Manifeste liegen im Netcup-Repo (`apps/betriebsrichtung-jobs/cronjobs.yaml`). Zeiten in UTC: `metar` stündlich zur Minute 17, `forecast-1` 04:30, `forecast-2` 10:30, `forecast-3` 16:30. Die CronJobs nutzen `ghcr.io/tobeworks/betriebsrichtung-jobs:latest` mit `imagePullPolicy: Always`, jeder Lauf zieht also das aktuelle Image.

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

## Geschätzte Wahrheit aus Messwind

Solange keine Quelle für die geflogene Richtung angebunden ist, schätzt der `metar`-Job die Wahrheit begonnener und vergangener Fenster aus den gemessenen Winden. Die Zeitachse trennt strikt: Zukünftige Fenster zeigen die Prognose (`status forecast`), begonnene und vergangene die Wahrheit (`slot_actual`), und ohne Wahrheit zeigt ein begonnenes Fenster "keine Daten", niemals eine Prognose.

- **Rechnung:** Je UTC-Stunde der mittlere Rückenwind für West, geglättet, dann dieselbe lineare Abbildung auf einen Ostanteil wie bei der Prognose (Band `west_back_tailwind_kn` bis `east_on_tailwind_kn`). Meldungen ohne Richtung (VRB) zählen nicht. `east_share` ist der Mittelwert, `truth` Ost ab mehr als `slot_majority`.
- **Abdeckung:** Mindestens 70 Prozent der Stunden brauchen Meldungen mit Richtung, sonst entsteht keine Zeile. Bei laufenden Fenstern gilt das für den abgelaufenen Teil bis zur letzten vollen Stunde, die Schätzung wird mit jedem Lauf neu gerechnet. Fenster, die vor der ersten geholten Meldung beginnen, bleiben ausgelassen.
- **Qualität:** `quality estimated`, `source wind_estimate`. Die API überschreibt damit nie eine Zeile mit `quality observed`, umgekehrt ersetzt eine echte Beobachtung die Schätzung.
- **Anzeige:** Das Frontend zeigt die Schätzung als Anteil ("geschätzt: eher Ost"), nicht als Ost oder West, kräftig gefärbt. Prognosen sind blass und gestrichelt.
- **Grenze:** Im Zwischenband von 0 bis 4 kn ist der Wind allein kein sicheres Maß. In der Nacht auf den 16.10.2026 lag der Rückenwind bei 3 bis 4 kn und es wurde durchgehend West geflogen, am 17.10. reichte etwa dasselbe für Ost. Deshalb ist die Schätzung ein Anteil, kein Urteil. Sie taugt auch nicht, um die Prognose zu bewerten, weil sie dasselbe Modell nutzt.

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
