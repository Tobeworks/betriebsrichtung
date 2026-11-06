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


def metar(rohtext, **felder):
    return {"obsTime": 1792176600, "rawOb": rohtext, "temp": 12, "dewp": 10, "altim": 1020, "wgst": None, "clouds": [],
            "wxString": None, **felder}


def test_wetter_klarer_himmel_cavok_hat_sicht_10_km_und_keine_wolken():
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 161320Z AUTO 23004KT 200V260 CAVOK 19/12 Q1020 NOSIG", temp=19, dewp=12)])
    assert (w["visibility_m"], w["ceiling_ft"], w["precipitation"], w["thunderstorm"], w["phenomena"]) == (9999, None, False, False, None)
    assert (w["temperature_c"], w["dewpoint_c"], w["pressure_hpa"], w["source"]) == (19.0, 12.0, 1020.0, "metar")


def test_wetter_nieselregen_mit_wolkenuntergrenze_aus_der_dicksten_untersten_schicht():
    wolken = [{"cover": "BKN", "base": 1800}, {"cover": "BKN", "base": 3400}, {"cover": "OVC", "base": 4400}]
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 170450Z AUTO 32008KT 9999 -DZ BKN018 BKN034 OVC044 14/10 Q1020 NOSIG", clouds=wolken)])
    assert (w["visibility_m"], w["ceiling_ft"], w["precipitation"], w["phenomena"]) == (9999, 1800, True, "-DZ")


def test_wetter_einzelne_wenige_wolken_sind_keine_untergrenze():
    wolken = [{"cover": "FEW", "base": 2100}, {"cover": "SCT", "base": 2800}]
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 170250Z AUTO 29005KT 250V330 9999 FEW021 SCT028 14/12 Q1019 NOSIG", clouds=wolken)])
    assert w["ceiling_ft"] is None
    assert w["visibility_m"] == 9999


def test_wetter_nebel_und_geringe_sicht_aus_der_hauptsicht_nicht_der_minimalsicht():
    (w,) = quellen.wetter_parsen([metar(
        "METAR EDDF 170050Z AUTO 21006KT 9999 0900 R25R/P2000N R25C/P2000N R18/P2000N BCFG FEW021 12/12 Q1019 NOSIG")])
    assert w["visibility_m"] == 9999 and w["phenomena"] == "BCFG" and w["precipitation"] is False


def test_wetter_gewitter_mit_regen_und_boe():
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 171250Z AUTO 25015G28KT 4000 +TSRA BKN012CB 18/16 Q1008 NOSIG", wgst=28)])
    assert (w["visibility_m"], w["precipitation"], w["thunderstorm"], w["gust_kn"], w["phenomena"]) == (4000, True, True, 28.0, "+TSRA")


def test_wetter_gewitter_in_der_naehe_zaehlt_nicht_als_gewitter_am_platz():
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 171250Z AUTO 25010KT 9999 VCTS FEW030 18/10 Q1008 NOSIG")])
    assert (w["thunderstorm"], w["precipitation"], w["phenomena"]) == (False, False, "VCTS")


def test_wetter_unplausibler_luftdruck_und_fehlende_felder_werden_zu_none():
    (w,) = quellen.wetter_parsen([metar("METAR EDDF 171250Z AUTO VRB02KT 9999 FEW030 18/10 Q1008", altim=29.9, temp=None, dewp=None)])
    assert (w["pressure_hpa"], w["temperature_c"], w["dewpoint_c"]) == (None, None, None)
    assert w["visibility_m"] == 9999


def test_wetter_ohne_zeitstempel_wird_uebersprungen_und_doppelte_zeiten_gelten_einmal():
    assert quellen.wetter_parsen([{"rawOb": "x"}]) == []
    assert len(quellen.wetter_parsen([metar("METAR EDDF 171250Z AUTO 25010KT CAVOK 18/10 Q1008")] * 2)) == 1

