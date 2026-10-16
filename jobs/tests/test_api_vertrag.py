import json
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

from betriebsrichtung_jobs import konfiguration, modell, quellen
from betriebsrichtung_jobs.modell import Modelllauf

SCHEMA_DIR = Path(os.environ.get("SCHEMA_DIR", Path(__file__).resolve().parents[2].parent / "api" / "schemas" / "betriebsrichtung"))
pytestmark = pytest.mark.skipif(not SCHEMA_DIR.exists(), reason="API-Repo liegt nicht daneben")


def _schemas():
    return {p.name: json.loads(p.read_text(encoding="utf-8")) for p in SCHEMA_DIR.glob("*.schema.json")}


def _pruefer(name):
    schemas = _schemas()
    registry = Registry().with_resources(
        (s["$id"], Resource.from_contents(s, default_specification=DRAFT202012)) for s in schemas.values()
    )
    return Draft202012Validator(schemas[name], registry=registry, format_checker=FormatChecker())


def _lauf(modellname, zeiten, geschwindigkeit, richtung, mitglieder=3):
    return Modelllauf(model=modellname, zeiten=zeiten,
                      geschwindigkeiten=[[geschwindigkeit] * len(zeiten) for _ in range(mitglieder)],
                      richtungen=[[richtung] * len(zeiten) for _ in range(mitglieder)])


def _zeiten(start, stunden):
    return [start + timedelta(hours=h) for h in range(stunden)]


def test_berechnete_zeilen_bestehen_die_api_schemas():
    konf = konfiguration.laden()
    chash = konfiguration.hash_von(konf)
    berechnet = datetime(2026, 10, 16, 18, tzinfo=timezone.utc)
    start = datetime(2026, 10, 17, 2, tzinfo=timezone.utc)
    laeufe = [
        _lauf("ecmwf_ifs025", _zeiten(start, 72), 20.0, 70.0),
        _lauf("gfs025", _zeiten(start, 72), 3.0, 250.0),
    ]
    prognosen, aggregate = modell.berechnen(laeufe, konf, berechnet, chash)
    assert prognosen and aggregate
    for zeile in prognosen:
        _pruefer("forecast.schema.json").validate({**zeile, "run_id": 1})
    for zeile in aggregate:
        _pruefer("wind_aggregate.schema.json").validate({**zeile, "run_id": 1})
    run = {"run_date": "2026-10-16", "run_seq": 1, "config_hash": chash, "computed_at": modell.iso(berechnet),
           "status": "ok", "duration_ms": 10,
           "models": [{"model": "ecmwf_ifs025", "init_time": modell.iso(berechnet), "members": 3}]}
    _pruefer("forecast_run.schema.json").validate(run)


def test_konfiguration_bestaet_das_schema():
    konf = konfiguration.laden()
    version = {"config_hash": konfiguration.hash_von(konf), "version": konf["version"], "content": konf,
               "created_at": "2026-10-16T18:00:00.000Z", "change_note": "Start"}
    _pruefer("forecast_config_version.schema.json").validate(version)


def test_metar_beobachtung_besteht_das_schema():
    (beobachtung,) = quellen.metar_parsen([{"obsTime": 1792176600, "wdir": 250, "wspd": 12}])
    eintrag = {"observed_at": beobachtung["observed_at"], "speed_kn": beobachtung["speed_kn"],
               "direction_deg": beobachtung["direction_deg"], "source": "metar", "recorded_at": "2026-10-16T19:00:00.000Z"}
    _pruefer("wind_observation.schema.json").validate(eintrag)
