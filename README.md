# Betriebsrichtung

Public project for **Betriebsrichtung**, an unofficial tool that shows how likely easterly operations are at Frankfurt Airport (EDDF), per time window (morning, afternoon, night), for the next 14 days and in the past.

> **Disclaimer:** Not an official source, no guarantee. Forecasts are probabilities, not promises.

## Repository layout

| Path | Contents |
|---|---|
| `schemas/betriebsrichtung/` | JSON Schemas (draft 2020-12) of all entities, configuration, error and timeline responses. This is the data contract between database, API and frontend. |
| `db/` | Generated database migration (MySQL/MariaDB) for all tables. |
| `scripts/` | Generators: database migration and TypeScript and Python types from the schemas. |
| `frontend/` | Web app (Vue 3, TypeScript, Vite, Tailwind CSS). See [frontend/README.md](frontend/README.md). |
| `jobs/` | Python jobs: wind observations from METAR and the 14-day forecast from Open-Meteo ensembles. |
| `docs/` | Project plan, API conventions, data sources, jobs and frontend notes. |
| `.github/workflows/` | CI: frontend checks, schema check, container images. |

## Schemas and database

The schemas define every table and every field. The database is generated from them, nothing is written by hand.

Generate the migration:

```bash
python3 scripts/betriebsrichtung_ddl.py              # print to stdout (dry run)
python3 scripts/betriebsrichtung_ddl.py --schreiben  # write db/2026-10-16_01_create_betriebsrichtung.sql
python3 scripts/betriebsrichtung_ddl.py --pruefen    # fail if the file differs from the schemas
```

Create a new database and import the migration (the database itself is created by you):

```bash
mysql -u <user> -p -e "CREATE DATABASE betriebsrichtung CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u <user> -p betriebsrichtung < db/2026-10-16_01_create_betriebsrichtung.sql
```

Tables are InnoDB with `utf8mb4`. Times are stored in UTC, the frontend converts them to Europe/Berlin for display.

## Generated types

```bash
pip install datamodel-code-generator==0.26.3
python3 scripts/generate_types.py
```

This writes TypeScript declarations to `frontend/src/api/generated/` and Pydantic models to `jobs/src/betriebsrichtung_jobs/generated/`. Do not edit these files by hand.

## Where the schemas come from

The schemas are maintained in the private Tobeworks API repository and copied here. A CI check compares the copy with the source, so both stay identical. Changes to a schema are made in the API repository first, then copied over.

## Frontend

```bash
cd frontend
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Details, configuration and deployment: [frontend/README.md](frontend/README.md).

## Jobs

The jobs fetch wind data and forecasts and write them to the API. They run as containers on a schedule. See [docs/jobs.md](docs/jobs.md).

## Data sources

- Wind forecasts: [Open-Meteo](https://open-meteo.com), CC BY 4.0, free use for non-commercial purposes.
- Observed wind at the airport: METAR reports via [aviationweather.gov](https://aviationweather.gov).

## Licence

No licence file has been added yet, so the code is not licensed for reuse.
