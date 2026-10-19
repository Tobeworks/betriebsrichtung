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

### Run the jobs locally

In production, Kubernetes CronJobs start the jobs on a schedule. Locally you start the same commands by hand.

| CronJob (UTC) | Command |
|---|---|
| `betriebsrichtung-metar`, at minute 27 and 57 | `python -m betriebsrichtung_jobs metar` |
| `betriebsrichtung-forecast-1`, 04:30 | `python -m betriebsrichtung_jobs forecast --lauf-nummer 1` |
| `betriebsrichtung-forecast-2`, 10:30 | `python -m betriebsrichtung_jobs forecast --lauf-nummer 2` |
| `betriebsrichtung-forecast-3`, 16:30 | `python -m betriebsrichtung_jobs forecast --lauf-nummer 3` |

**Shortcut with pnpm.** After the setup below, run the jobs from `frontend/` (the scripts use `jobs/.venv` if it exists, otherwise `python3`):

```bash
cd frontend
pnpm dev:metar --trockenlauf       # dry run, writes nothing
pnpm dev:forecast --trockenlauf
pnpm dev:metar                     # writes to the local API from jobs/.env
pnpm dev:forecast                  # run number is derived from the clock (4 to 99)
pnpm dev:forecast --lauf-nummer 5  # or pick the number yourself
```

Add `--silent` (`pnpm -s dev:metar`) to hide pnpm's own output. The plain commands without pnpm are below.

**Setup (once).** Python 3.11 to 3.13 is recommended (the container uses 3.11, the pinned Pydantic does not build on 3.14):

```bash
cd jobs
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export PYTHONPATH=src
```

**Dry run.** Fetches the data and calculates, but writes nothing and needs neither the API nor a token. This is the safe default while you work on the model or `jobs/config/forecast.json`:

```bash
python -m betriebsrichtung_jobs metar --trockenlauf
python -m betriebsrichtung_jobs forecast --lauf-nummer 1 --trockenlauf
```

**Write to a local API.** Start the API from the private API repository against its local development database, then create `jobs/.env` (git-ignored, read automatically):

```bash
BETRIEBSRICHTUNG_API_URL=http://127.0.0.1:5001/betriebsrichtung/v1
BETRIEBSRICHTUNG_INGEST_TOKEN=<same value as BETRIEBSRICHTUNG_INGEST_TOKEN of the local API>
```

```bash
python -m betriebsrichtung_jobs metar
python -m betriebsrichtung_jobs forecast --lauf-nummer 1
```

Then run `pnpm dev` in `frontend/` (it proxies `/betriebsrichtung` to `127.0.0.1:5001`). The API caches the timeline for 5 minutes, so use a hard reload to see new values.

Good to know:
- **One forecast run per number and day.** A second call with the same `--lauf-nummer` on the same day answers `vorhanden` and writes nothing. For repeated local runs use a free number between 1 and 99 (for example 4, 5, 6).
- **Other settings.** `BETRIEBSRICHTUNG_CONFIG=/path/to/forecast.json` uses another configuration, for example to try different thresholds in a dry run. `--archiv DIR` (or `BETRIEBSRICHTUNG_ARCHIV_DIR`) also stores the raw ensemble data.
- **Windows that already started** show no forecast. The API estimates their truth from the stored wind observations (`status estimated`), so run `pnpm dev:metar` to keep the wind data current.
- **Exit code.** A failed run exits with a non-zero code and prints the reason. The same run on the cluster is described in [docs/jobs.md](docs/jobs.md#cronjob-auf-dem-cluster-auslösen).

## Data sources

- Wind forecasts: [Open-Meteo](https://open-meteo.com), CC BY 4.0, free use for non-commercial purposes.
- Observed wind at the airport: METAR reports via [aviationweather.gov](https://aviationweather.gov).

## Licence

No licence file has been added yet, so the code is not licensed for reuse.
