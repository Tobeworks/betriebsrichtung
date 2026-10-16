from datetime import datetime, timezone

from betriebsrichtung_jobs import quellen


def test_metar_vrb_wird_zu_keiner_richtung():
    eintraege = [{"obsTime": 1792176600, "wdir": "VRB", "wspd": 1}]
    (beobachtung,) = quellen.metar_parsen(eintraege)
    assert beobachtung["direction_deg"] is None
    assert beobachtung["speed_kn"] == 1.0
    assert beobachtung["source"] == "metar"
    assert beobachtung["observed_at"] == datetime.fromtimestamp(1792176600, tz=timezone.utc).strftime(
        "%Y-%m-%dT%H:%M:%S") + "Z"


def test_metar_zahl_richtung_bleibt_erhalten():
    (beobachtung,) = quellen.metar_parsen([{"obsTime": 1792176600, "wdir": 250, "wspd": 12}])
    assert beobachtung["direction_deg"] == 250.0


def test_metar_ohne_wind_wird_uebersprungen():
    assert quellen.metar_parsen([{"obsTime": 1792176600, "wdir": 250, "wspd": None}]) == []


def test_ensemble_luecke_wird_zur_fehlenden_stunde():
    daten = {"hourly": {
        "time": ["2026-10-16T00:00", "2026-10-16T01:00", "2026-10-16T02:00"],
        "wind_speed_10m": [10, 11, 12],
        "wind_speed_10m_member01": [9, None, 11],
        "wind_direction_10m": [70, 70, 70],
        "wind_direction_10m_member01": [70, 70, None],
    }}
    lauf = quellen.ensemble_parsen(daten, "testmodell")
    assert len(lauf.zeiten) == 1
    assert lauf.geschwindigkeiten == [[10.0], [9.0]]
    assert lauf.richtungen == [[70.0], [70.0]]


def test_ensemble_kontrolllauf_steht_vorn():
    daten = {"hourly": {
        "time": ["2026-10-16T00:00"],
        "wind_speed_10m": [10],
        "wind_speed_10m_member02": [8],
        "wind_speed_10m_member01": [9],
        "wind_direction_10m": [70],
        "wind_direction_10m_member01": [60],
        "wind_direction_10m_member02": [50],
    }}
    lauf = quellen.ensemble_parsen(daten, "testmodell")
    assert lauf.geschwindigkeiten == [[10.0], [9.0], [8.0]]


def test_ensemble_url_fordert_knoten_und_utc_an():
    url = quellen.ensemble_url("ecmwf_ifs025", 50.04, 8.56, 14)
    assert "wind_speed_unit=kn" in url
    assert "timezone=UTC" in url
    assert "models=ecmwf_ifs025" in url
