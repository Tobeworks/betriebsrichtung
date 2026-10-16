# Jobs (Phase 4)

Stand: 2026-10-16. Paket `jobs/src/betriebsrichtung_jobs`, nur Standardbibliothek plus Pydantic für die Konfigurationsprüfung. Die Jobs schreiben ausschließlich über die Ingest-Endpunkte der API (`docs/api-konventionen.md`, Plan Abschnitt 8).

## Befehle

```
python -m betriebsrichtung_jobs metar [--trockenlauf]
python -m betriebsrichtung_jobs forecast --lauf-nummer 1-99 [--archiv DIR] [--trockenlauf]
```

- `metar`: holt die METAR-Meldungen von EDDF der letzten 24 Stunden und speichert sie als Winddaten (`wind-observations`).
- `forecast`: holt für jedes Modell in `jobs/config/forecast.json` das 14-Tage-Ensemble, rechnet Ostwahrscheinlichkeiten je Zeitfenster und schreibt den Lauf atomar (`forecast-configs`, `forecast-runs`).
- `--trockenlauf`: rechnet und gibt aus, schreibt nichts und archiviert nichts.
- Ein Lauf protokolliert sich am Ende mit einem Eintrag in `job-runs`.

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

## Bekannte Grenzen (ehrlich)

- **Keine Richtungsbeobachtung.** Umwelthaus ist nicht freigegeben (kein Scraping ohne Erlaubnis), ADS-B und D-ATIS sind nicht geprüft. Der Observation-Logger ist deshalb in dieser Phase ein Winddaten-Logger (METAR). Die Anfangszustände der Automaten werden aus dem ersten Wind bestimmt, nicht aus einer beobachteten Richtung. Sobald eine freigegebene Richtungsquelle da ist, sollte der Anfangszustand daraus kommen (Plan 4b, Punkt 5).
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
