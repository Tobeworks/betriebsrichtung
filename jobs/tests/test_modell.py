from datetime import datetime, timedelta, timezone

import pytest

from betriebsrichtung_jobs import modell
from betriebsrichtung_jobs.modell import Modelllauf

DEC = {"east_on_tailwind_kn": 4, "west_back_tailwind_kn": 0, "smoothing_hours": 1, "min_dwell_hours": 0,
       "slot_majority": 0.5}


def utc(*teile):
    return datetime(*teile, tzinfo=timezone.utc)


@pytest.mark.parametrize("zeit, erwartet", [
    (utc(2026, 10, 16, 6), ("2026-10-16", "morning")),
    (utc(2026, 10, 16, 12), ("2026-10-16", "afternoon")),
    (utc(2026, 10, 16, 20), ("2026-10-16", "night")),
    (utc(2026, 10, 16, 23), ("2026-10-16", "night")),
    (utc(2026, 10, 17, 1), ("2026-10-16", "night")),
])
def test_fenster_zuordnung_in_lokalzeit(zeit, erwartet):
    datum, slot = modell.fenster_von(zeit)
    assert (datum.isoformat(), slot) == erwartet


def test_nachtfenster_an_zeitumstellung_fruehjahr_hat_sieben_stunden():
    from datetime import date
    start, ende = modell.fenstergrenzen(date(2026, 3, 28), "night")
    assert (ende - start).total_seconds() / 3600 == 7


def test_nachtfenster_an_zeitumstellung_herbst_hat_neun_stunden():
    from datetime import date
    start, ende = modell.fenstergrenzen(date(2026, 10, 24), "night")
    assert (ende - start).total_seconds() / 3600 == 9


def test_rueckenwind_positiv_bei_ostwind_negativ_bei_westwind():
    assert modell.rueckenwind_west(10, 70, 70) == pytest.approx(10)
    assert modell.rueckenwind_west(10, 250, 70) == pytest.approx(-10)


def test_ostanteil_ist_im_band_linear_und_ausserhalb_begrenzt():
    assert [modell.ost_anteil(w, 0, 4) for w in (-3, 0, 1, 2, 4, 9)] == [0, 0, 0.25, 0.5, 1, 1]


def test_einig_aber_im_band_ergibt_keine_sicherheit():
    # alle Mitglieder: Nordwind, 2 kn Rückenwind West -> Wechsel möglich, nicht 0 Prozent
    start = utc(2026, 10, 17, 4)
    zeiten = [start + timedelta(hours=h) for h in range(8)]
    lauf = Modelllauf(model="m", zeiten=zeiten, geschwindigkeiten=[[5.8] * 8] * 3, richtungen=[[0.0] * 8] * 3)
    fenster = modell.auswerten(lauf, DEC, 70)[(start.date(), "morning")]
    assert fenster.p_model == pytest.approx(0.5, abs=0.05)


def test_auswertung_ueberwiegend_ost_gibt_wahrscheinlichkeit_eins():
    start = utc(2026, 10, 17, 4)
    zeiten = [start + timedelta(hours=h) for h in range(8)]
    lauf = Modelllauf(model="testmodell", zeiten=zeiten,
                      geschwindigkeiten=[[20.0] * 8 for _ in range(3)],
                      richtungen=[[70.0] * 8 for _ in range(3)])
    ergebnis = modell.auswerten(lauf, DEC, 70)
    fenster = ergebnis[(start.date(), "morning")]
    assert fenster.p_model == 1.0
    assert fenster.stunden == 8
    assert fenster.mitglieder == 3


def test_unvollstaendiges_fenster_wird_nicht_ausgewertet():
    start = utc(2026, 10, 17, 4)
    zeiten = [start + timedelta(hours=h) for h in range(3)]
    lauf = Modelllauf(model="m", zeiten=zeiten, geschwindigkeiten=[[20.0] * 3], richtungen=[[70.0] * 3])
    assert modell.auswerten(lauf, DEC, 70) == {}


def test_mischung_ignoriert_nullgewichte_und_begrenzt():
    assert modell.mische([(0.5, 0.0), (0.9, 0.0)], 0.02, 0.98) is None
    roh, klemme = modell.mische([(1.0, 1.0), (0.99, 1.0)], 0.02, 0.98)
    assert roh == pytest.approx(0.995)
    assert klemme == 0.98


def test_vorlauf_bucket_grenzen():
    assert modell.vorlauf_bucket(2.9) == "d0_2"
    assert modell.vorlauf_bucket(3) == "d3_7"
    assert modell.vorlauf_bucket(8) == "d8_14"


def test_quantil_nach_rang():
    werte = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    assert modell.quantil(werte, 0.5) == 5
    assert modell.quantil(werte, 0.9) == 9


def test_richtungsmittel_um_nord_ist_nahe_null():
    mittel, laenge = modell.richtungsmittel([350, 10])
    assert min(mittel, 360 - mittel) < 0.01
    assert laenge > 0.98


def beobachtung(zeit, geschwindigkeit, richtung):
    return {"observed_at": modell.iso(zeit)[:19] + "Z", "speed_kn": geschwindigkeit, "direction_deg": richtung,
            "source": "metar"}


def test_stundenwerte_mitteln_je_stunde_und_ignorieren_vrb():
    start = utc(2026, 10, 17, 4)
    werte = modell.stundenwerte([
        beobachtung(start + timedelta(minutes=20), 10, 70),
        beobachtung(start + timedelta(minutes=50), 6, 70),
        beobachtung(start + timedelta(hours=1, minutes=20), 5, None),
    ], 70)
    assert werte == {start: pytest.approx(8.0)}


def schaetzung(richtung, geschwindigkeit, stunden, jetzt):
    from betriebsrichtung_jobs import konfiguration
    start = utc(2026, 10, 17, 4)
    beobachtungen = [beobachtung(start + timedelta(hours=h, minutes=20), geschwindigkeit, richtung) for h in range(stunden)]
    return modell.schaetze_fenster(beobachtungen, konfiguration.laden(), jetzt)


def test_schaetzung_ost_bei_ostwind_fuer_beendetes_und_laufendes_fenster():
    zeilen = schaetzung(70, 10, 11, utc(2026, 10, 17, 15, 17))
    nach_fenster = {z["slot"]: z for z in zeilen}
    assert set(nach_fenster) == {"morning", "afternoon"}
    assert nach_fenster["morning"]["truth"] == "east"
    assert nach_fenster["morning"]["east_share"] == 1.0
    assert nach_fenster["morning"]["observed_share"] == 1.0
    # laufend: Stunden 12 bis 14 UTC, bezogen auf den abgelaufenen Teil
    assert nach_fenster["afternoon"]["observed_share"] == 1.0
    assert all(z["quality"] == "estimated" and z["source"] == "wind_estimate" for z in zeilen)


def test_schaetzung_west_bei_westwind():
    zeilen = schaetzung(250, 10, 8, utc(2026, 10, 17, 13, 17))
    assert [(z["slot"], z["truth"]) for z in zeilen] == [("morning", "west")]


def test_schaetzung_ohne_genug_abdeckung_liefert_keine_zeile():
    assert schaetzung(70, 10, 3, utc(2026, 10, 17, 13, 17)) == []


def test_schaetzung_laesst_fenster_vor_der_ersten_meldung_aus():
    # erste Meldung 06:20 UTC: das Vormittagsfenster (ab 04:00 UTC) ist unvollständig und bekommt nichts
    from betriebsrichtung_jobs import konfiguration
    start = utc(2026, 10, 17, 6)
    beobachtungen = [beobachtung(start + timedelta(hours=h, minutes=20), 10, 70) for h in range(6)]
    assert modell.schaetze_fenster(beobachtungen, konfiguration.laden(), utc(2026, 10, 17, 13, 17)) == []

