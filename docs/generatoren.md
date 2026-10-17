# Generatoren und Schema-Abgleich

Stand: 2026-10-16. Die Schemas liegen in der API-Repo unter `schemas/betriebsrichtung/` und sind die einzige Quelle der Wahrheit (Plan Abschnitt 2, 7). Alles andere wird daraus erzeugt.

## Was erzeugt wird

| Ziel | Werkzeug | Ort | Wo ausgeführt |
|---|---|---|---|
| DDL-Migration | `scripts/betriebsrichtung_ddl.py` | `db/2026-10-16_01_create_betriebsrichtung.sql` | Dieses Repo |
| TypeScript-Typen | `json-schema-to-typescript@16.0.0` | `frontend/src/api/generated/` | Dieses Repo |
| Pydantic-Modelle (v2) | `datamodel-code-generator==0.26.3` | `jobs/src/betriebsrichtung_jobs/generated/` | Dieses Repo |

Generierte Dateien werden nie von Hand bearbeitet und nicht durch Linting verändert.

## Befehle

Typen und Modelle, aus diesem Repo, mit dem API-Repo daneben:

```
pip install datamodel-code-generator==0.26.3
python scripts/generate_types.py
```

Die Quelle ist die Kopie `schemas/betriebsrichtung/` in diesem Repo. Die Kopie ist identisch mit `api/schemas/betriebsrichtung/` im privaten API-Repo, das prüft die CI. Liegt die Kopie woanders, `SCHEMA_DIR` setzen.

DDL, in diesem Repo:

```
python scripts/betriebsrichtung_ddl.py
python scripts/betriebsrichtung_ddl.py --schreiben
python scripts/betriebsrichtung_ddl.py --pruefen
```

Ohne Parameter wird nur ausgegeben (Trockenlauf). `--schreiben` schreibt die Migration. `--pruefen` bricht mit Exit 1 ab, wenn die Migration vom Schema abweicht.

## Schema-Abgleich in der CI

`.github/workflows/schema-check.yaml` checkt das API-Repo mit dem Secret `API_REPO_TOKEN` aus, erzeugt Typen und Modelle neu und schlägt fehl, wenn sich dabei etwas ändert. Danach prüft es die Migration gegen das Schema.

Das Repository-Kürzel `tobeworks/api` in der Workflow-Datei ist aus dem Image-Namen (`ghcr.io/tobeworks/tw_api`) abgeleitet, nicht geprüft. Vor dem ersten Lauf auf GitHub nachsehen.

## Bekannte Grenzen

- Die Pydantic-Modelle übersetzen `if`/`then`-Regeln nicht. Die Regel in `external_forecast` (direction oder probability gesetzt) prüft das JSON-Schema in der API. Die Modelle in den Jobs sind dafür weniger streng.
- Die Klassennamen in Python entstehen aus den `title`-Feldern. Umlaute werden dabei verstümmelt (`Prognosegüte` wird zu `PrognosegTe`). Die Module funktionieren, nur die Namen sehen ungewohnt aus.
- Das DDL erzeugt nur das vollständige Anlegen. Eine Differenz gegen eine bestehende Datenbank (ALTER) fehlt noch. Sie kommt, sobald die erste Schemaänderung nach der Erstmigration ansteht.
- Die DB-Enum-Werte liegen als `VARCHAR` vor, nicht als `ENUM`. So lässt sich ein Wert später ergänzen, ohne die Tabelle umzubauen.
