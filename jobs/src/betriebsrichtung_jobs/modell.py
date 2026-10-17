import math
import statistics
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

BERLIN = ZoneInfo("Europe/Berlin")
MIN_ABDECKUNG = 0.7
FENSTER_BEGINN = {"morning": 6, "afternoon": 14, "night": 22}
FENSTER_ENDE = {"morning": 14, "afternoon": 22, "night": 6}


def utc(zeit):
    return zeit.astimezone(timezone.utc)


def iso(zeit):
    return utc(zeit).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


def fenster_von(stunde_utc):
    lokal = stunde_utc.astimezone(BERLIN)
    stunde = lokal.hour
    if 6 <= stunde < 14:
        return lokal.date(), "morning"
    if 14 <= stunde < 22:
        return lokal.date(), "afternoon"
    if stunde >= 22:
        return lokal.date(), "night"
    return lokal.date() - timedelta(days=1), "night"


def fenstergrenzen(datum, slot):
    start = datetime(datum.year, datum.month, datum.day, FENSTER_BEGINN[slot], tzinfo=BERLIN)
    ende_tag = datum if slot != "night" else datum + timedelta(days=1)
    ende = datetime(ende_tag.year, ende_tag.month, ende_tag.day, FENSTER_ENDE[slot], tzinfo=BERLIN)
    return utc(start), utc(ende)


def rueckenwind_west(geschwindigkeit, richtung, ost_landebahn_grad):
    return geschwindigkeit * math.cos(math.radians(richtung - ost_landebahn_grad))


def gleitend(werte, fenster):
    ausgabe = []
    for index in range(len(werte)):
        ausschnitt = werte[max(0, index - fenster + 1): index + 1]
        ausgabe.append(sum(ausschnitt) / len(ausschnitt))
    return ausgabe


def ost_anteil(rueckenwind, west_bis, ost_ab):
    # ponytail: lineares Band statt harter Schwelle, die DFS entscheidet dazwischen nicht eindeutig
    return min(1.0, max(0.0, (rueckenwind - west_bis) / (ost_ab - west_bis)))


@dataclass
class Fensterwert:
    window_start: datetime
    window_end: datetime
    local_date: object
    slot: str
    stunden: int
    p_model: float
    erwarteter_anteil: float
    mitglieder: int
    rueckenwinde: list
    geschwindigkeiten: list
    richtungen: list


@dataclass
class Modelllauf:
    model: str
    zeiten: list
    geschwindigkeiten: list
    richtungen: list


def auswerten(lauf, dec, ost_landebahn_grad):
    zeiten = lauf.zeiten
    fenster = {}
    for index, zeit in enumerate(zeiten):
        datum, slot = fenster_von(zeit)
        fenster.setdefault((datum, slot), []).append(index)

    mitglieder = len(lauf.geschwindigkeiten)
    anteile = [[] for _ in range(mitglieder)]
    rueckenwind_listen = []
    for mitglied in range(mitglieder):
        rw = [rueckenwind_west(v, d, ost_landebahn_grad)
              for v, d in zip(lauf.geschwindigkeiten[mitglied], lauf.richtungen[mitglied])]
        rueckenwind_listen.append(rw)
        glatt = gleitend(rw, dec["smoothing_hours"])
        anteile[mitglied] = [ost_anteil(w, dec["west_back_tailwind_kn"], dec["east_on_tailwind_kn"]) for w in glatt]

    ergebnis = {}
    for (datum, slot), indizes in sorted(fenster.items(), key=lambda kv: kv[1][0]):
        start, ende = fenstergrenzen(datum, slot)
        erwartet = (ende - start).total_seconds() / 3600
        if len(indizes) / erwartet < MIN_ABDECKUNG:
            continue
        mitgliedsanteile = [sum(anteile[m][i] for i in indizes) / len(indizes) for m in range(mitglieder)]
        ergebnis[(datum, slot)] = Fensterwert(
            window_start=start,
            window_end=ende,
            local_date=datum,
            slot=slot,
            stunden=len(indizes),
            p_model=sum(mitgliedsanteile) / mitglieder,
            erwarteter_anteil=sum(mitgliedsanteile) / mitglieder,
            mitglieder=mitglieder,
            rueckenwinde=[rueckenwind_listen[m][i] for m in range(mitglieder) for i in indizes],
            geschwindigkeiten=[lauf.geschwindigkeiten[m][i] for m in range(mitglieder) for i in indizes],
            richtungen=[lauf.richtungen[m][i] for m in range(mitglieder) for i in indizes],
        )
    return ergebnis


def vorlauf_bucket(vorlauf_tage):
    if vorlauf_tage < 3:
        return "d0_2"
    if vorlauf_tage < 8:
        return "d3_7"
    return "d8_14"


def stundenwerte(beobachtungen, ost_landebahn_grad):
    """METAR-Meldungen zu einem mittleren Rückenwind (West) je UTC-Stunde. Meldungen ohne Richtung (VRB) zählen nicht."""
    summen = {}
    for beobachtung in beobachtungen:
        if beobachtung["direction_deg"] is None:
            continue
        zeit = datetime.fromisoformat(beobachtung["observed_at"].replace("Z", "+00:00"))
        stunde = zeit.replace(minute=0, second=0, microsecond=0)
        summen.setdefault(stunde, []).append(
            rueckenwind_west(beobachtung["speed_kn"], beobachtung["direction_deg"], ost_landebahn_grad)
        )
    return {stunde: sum(werte) / len(werte) for stunde, werte in sorted(summen.items())}


def schaetze_fenster(beobachtungen, konfiguration, jetzt):
    """Geschätzte Wahrheit (slot_actual, quality estimated) aus gemessenem Wind, nach derselben Regel wie die Prognose.

    Das ist keine Beobachtung der Betriebsrichtung. Laufende Fenster zählen nur bis zur letzten vollen Stunde, ihre
    Abdeckung bezieht sich auf diesen Teil und die Schätzung wird mit jedem Lauf neu gerechnet."""
    dec = konfiguration["decision"]
    rueckenwind = stundenwerte(beobachtungen, konfiguration["axis"]["east_landing_deg"])
    if not rueckenwind:
        return []
    glatt = dict(zip(rueckenwind, gleitend(list(rueckenwind.values()), dec["smoothing_hours"])))
    anteile = {
        stunde: ost_anteil(wert, dec["west_back_tailwind_kn"], dec["east_on_tailwind_kn"])
        for stunde, wert in glatt.items()
    }
    erste = next(iter(anteile))
    volle_stunde = jetzt.replace(minute=0, second=0, microsecond=0)
    zeilen = []
    for datum, slot in sorted({fenster_von(stunde) for stunde in anteile}):
        start, ende = fenstergrenzen(datum, slot)
        bis = min(ende, volle_stunde)
        stunden = int((bis - start).total_seconds() // 3600)
        if start < erste or stunden < 1:
            continue
        werte = [anteil for stunde, anteil in anteile.items() if start <= stunde < bis]
        abdeckung = len(werte) / stunden
        if abdeckung < MIN_ABDECKUNG:
            continue
        ost = sum(werte) / len(werte)
        zeilen.append({
            "local_date": datum.isoformat(), "slot": slot, "window_start": iso(start), "window_end": iso(ende),
            "east_share": round(ost, 4), "observed_share": round(abdeckung, 4),
            "truth": "east" if ost > dec["slot_majority"] else "west",
            "source": "wind_estimate", "quality": "estimated", "computed_at": iso(jetzt),
        })
    return zeilen


def begrenzen(wert, untergrenze, obergrenze):
    return round(min(max(wert, untergrenze), obergrenze), 4)


def mische(beitraege, untergrenze, obergrenze):
    gewichtet = [(p, w) for p, w in beitraege if w > 0]
    summe = sum(w for _, w in gewichtet)
    if summe == 0:
        return None
    roh = sum(p * w for p, w in gewichtet) / summe
    return round(roh, 4), begrenzen(roh, untergrenze, obergrenze)


def quantil(werte, anteil):
    sortiert = sorted(werte)
    index = min(len(sortiert) - 1, max(0, math.ceil(anteil * len(sortiert)) - 1))
    return sortiert[index]


def richtungsmittel(richtungen):
    sinus = sum(math.sin(math.radians(r)) for r in richtungen)
    kosinus = sum(math.cos(math.radians(r)) for r in richtungen)
    mittel = math.degrees(math.atan2(sinus, kosinus)) % 360
    laenge = math.hypot(sinus, kosinus) / len(richtungen)
    return round(mittel, 2), round(laenge, 4)


def berechnen(laeufe, konfiguration, computed_at, config_hash):
    dec = konfiguration["decision"]
    ost_grad = konfiguration["axis"]["east_landing_deg"]
    gewichte = {m["id"]: m["weights"] for m in konfiguration["models"]}
    limits = konfiguration["limits"]
    auswertungen = {lauf.model: auswerten(lauf, dec, ost_grad) for lauf in laeufe}

    forecasts, aggregate = [], []
    fenster_schluessel = sorted(
        {k for a in auswertungen.values() for k, w in a.items() if w.window_start >= computed_at},
        key=lambda k: (k[0], k[1]),
    )
    for schluessel in fenster_schluessel:
        beitraege = []
        anteile_erwartet = []
        mitglieder_gesamt = 0
        zeile_fenster = None
        for modell, auswertung in auswertungen.items():
            if schluessel not in auswertung or auswertung[schluessel].window_start < computed_at:
                continue
            wert = auswertung[schluessel]
            zeile_fenster = wert
            vorlauf_tage = (wert.window_start - computed_at).total_seconds() / 86400
            gewicht = gewichte.get(modell, {}).get(vorlauf_bucket(vorlauf_tage), 0.0)
            roh = round(wert.p_model, 4)
            klemme = begrenzen(roh, limits["probability_min"], limits["probability_max"])
            forecasts.append({
                "window_start": iso(wert.window_start), "window_end": iso(wert.window_end),
                "local_date": wert.local_date.isoformat(), "slot": wert.slot, "model": modell,
                "p_east_raw": roh, "p_east": klemme, "calibrated": False,
                "expected_east_share": round(wert.erwarteter_anteil, 4), "members": wert.mitglieder,
                "lead_hours": round((wert.window_start - computed_at).total_seconds() / 3600, 2),
                "config_hash": config_hash,
            })
            mittel, laenge = richtungsmittel(wert.richtungen)
            aggregate.append({
                "window_start": iso(wert.window_start), "model": modell,
                "east_member_share": round(wert.p_model, 4), "mean_direction_deg": mittel,
                "mean_speed_kn": round(statistics.fmean(wert.geschwindigkeiten), 2),
                "resultant_length": laenge,
                "speed_sd": round(statistics.pstdev(wert.geschwindigkeiten), 2),
                "tailwind_p10": round(quantil(wert.rueckenwinde, 0.10), 2),
                "tailwind_p50": round(quantil(wert.rueckenwinde, 0.50), 2),
                "tailwind_p90": round(quantil(wert.rueckenwinde, 0.90), 2),
            })
            beitraege.append((wert.p_model, gewicht))
            anteile_erwartet.append(wert.erwarteter_anteil)
            mitglieder_gesamt += wert.mitglieder
        misch = mische(beitraege, limits["probability_min"], limits["probability_max"])
        if misch and zeile_fenster is not None:
            roh, klemme = misch
            forecasts.append({
                "window_start": iso(zeile_fenster.window_start), "window_end": iso(zeile_fenster.window_end),
                "local_date": zeile_fenster.local_date.isoformat(), "slot": zeile_fenster.slot, "model": "blend",
                "p_east_raw": roh, "p_east": klemme, "calibrated": False,
                "expected_east_share": round(statistics.fmean(anteile_erwartet), 4), "members": mitglieder_gesamt,
                "lead_hours": round((zeile_fenster.window_start - computed_at).total_seconds() / 3600, 2),
                "config_hash": config_hash,
            })
    return forecasts, aggregate
