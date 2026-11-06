import json
import re
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from .modell import Modelllauf

OPEN_METEO_URL = "https://ensemble-api.open-meteo.com/v1/ensemble"
METAR_URL = "https://aviationweather.gov/api/data/metar"
USER_AGENT = "betriebsrichtung-jobs/0.1 (+https://betriebsrichtung.tobeworks.de)"
VERSUCHE = 3


def abrufen(url, versuche=VERSUCHE, timeout=30):
    letzter = None
    for versuch in range(versuche):
        try:
            anfrage = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(anfrage, timeout=timeout) as antwort:
                return antwort.read()
        except OSError as fehler:
            letzter = fehler
            time.sleep(2 ** versuch)
    raise RuntimeError(f"Abruf fehlgeschlagen nach {versuche} Versuchen: {letzter}")


def ensemble_url(modell, latitude, longitude, tage=14):
    parameter = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "wind_speed_unit": "kn",
        "timezone": "UTC",
        "forecast_days": tage,
        "models": modell,
    }
    return OPEN_METEO_URL + "?" + urllib.parse.urlencode(parameter)


def _mitglieder_spalten(stunden, praefix):
    spalten = []
    if praefix in stunden:
        spalten.append(praefix)
    nummern = sorted(k for k in stunden if k.startswith(praefix + "_member"))
    spalten.extend(nummern)
    return spalten


def ensemble_parsen(daten, modell):
    stunden = daten["hourly"]
    zeiten = [datetime.fromisoformat(z).replace(tzinfo=timezone.utc) for z in stunden["time"]]
    speed_spalten = _mitglieder_spalten(stunden, "wind_speed_10m")
    dir_spalten = _mitglieder_spalten(stunden, "wind_direction_10m")
    if len(speed_spalten) != len(dir_spalten) or not speed_spalten:
        raise ValueError(f"{modell}: Spalten passen nicht zusammen")
    for spalte in speed_spalten + dir_spalten:
        if len(stunden[spalte]) != len(zeiten):
            raise ValueError(f"{modell}: Länge von {spalte} passt nicht zur Zeitachse")
    gueltig = [
        i for i in range(len(zeiten))
        if all(stunden[s][i] is not None for s in speed_spalten + dir_spalten)
    ]
    zeiten = [zeiten[i] for i in gueltig]
    geschwindigkeiten = [[float(stunden[s][i]) for i in gueltig] for s in speed_spalten]
    richtungen = [[float(stunden[s][i]) for i in gueltig] for s in dir_spalten]
    return Modelllauf(model=modell, zeiten=zeiten, geschwindigkeiten=geschwindigkeiten, richtungen=richtungen)


def ensemble_holen(modell, latitude, longitude, tage=14):
    daten = json.loads(abrufen(ensemble_url(modell, latitude, longitude, tage)))
    if "error" in daten:
        raise RuntimeError(f"{modell}: {daten.get('reason', 'Fehler')}")
    return ensemble_parsen(daten, modell)


def metar_url(icao, stunden=24):
    return f"{METAR_URL}?ids={icao}&format=json&hours={stunden}"


def metar_parsen(eintraege):
    ausgabe = {}
    for eintrag in eintraege:
        if eintrag.get("obsTime") is None or eintrag.get("wspd") is None:
            continue
        zeit = datetime.fromtimestamp(int(eintrag["obsTime"]), tz=timezone.utc)
        wdir = eintrag.get("wdir")
        richtung = None if wdir in (None, "VRB") else float(wdir)
        schluessel = zeit.isoformat()
        ausgabe[schluessel] = {
            "observed_at": zeit.strftime("%Y-%m-%dT%H:%M:%S") + "Z",
            "speed_kn": float(eintrag["wspd"]),
            "direction_deg": richtung,
            "source": "metar",
        }
    return list(ausgabe.values())


WIND_GRUPPE = re.compile(r"^(\d{3}|VRB)\d{2,3}(G\d{2,3})?(KT|MPS)$")
RICHTUNGSSCHWANKUNG = re.compile(r"^\d{3}V\d{3}$")
SICHT_GRUPPE = re.compile(r"^\d{4}$")
_PHAENOMEN = "(?:DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PO|SQ|FC|SS|DS)"
_BESCHREIBER = "(?:MI|BC|PR|DR|BL|SH|TS|FZ)"
WETTER_GRUPPE = re.compile(rf"^[-+]?(?:VC)?(?:{_BESCHREIBER}(?:{_PHAENOMEN})*|(?:{_PHAENOMEN})+)$")
NIEDERSCHLAG = re.compile(r"DZ|RA|SN|SG|IC|PL|GR|GS|UP")
DICKE_WOLKEN = ("BKN", "OVC", "VV")


def _sicht_aus_rohtext(rohtext):
    """Hauptsicht in Metern aus der Rohmeldung: CAVOK gilt als 9999, sonst die vierstellige Gruppe nach dem Wind."""
    gruppen = (rohtext or "").split()
    if "CAVOK" in gruppen:
        return 9999
    for index, gruppe in enumerate(gruppen):
        if WIND_GRUPPE.match(gruppe):
            nachfolger = index + 1
            if nachfolger < len(gruppen) and RICHTUNGSSCHWANKUNG.match(gruppen[nachfolger]):
                nachfolger += 1
            if nachfolger < len(gruppen) and SICHT_GRUPPE.match(gruppen[nachfolger]):
                return int(gruppen[nachfolger])
            return None
    return None


def _erscheinungen(rohtext):
    """Wettergruppen der Rohmeldung (zum Beispiel -RA oder BR), ohne Bemerkungen nach RMK."""
    ergebnis = []
    for gruppe in (rohtext or "").split():
        if gruppe == "RMK":
            break
        if WETTER_GRUPPE.match(gruppe):
            ergebnis.append(gruppe)
    return ergebnis


def _wolkenuntergrenze(wolken):
    """Unterste durchbrochene oder geschlossene Schicht (BKN, OVC, VV) in Fuß, None ohne eine solche."""
    basen = [int(w["base"]) for w in wolken or [] if w.get("cover") in DICKE_WOLKEN and w.get("base") is not None]
    return min(basen) if basen else None


def wetter_parsen(eintraege):
    """METAR-Einträge (JSON von aviationweather.gov) zu Wetterbeobachtungen nach weather_observation.schema.json."""
    ausgabe = {}
    for eintrag in eintraege:
        if eintrag.get("obsTime") is None:
            continue
        zeit = datetime.fromtimestamp(int(eintrag["obsTime"]), tz=timezone.utc)
        erscheinungen = _erscheinungen(eintrag.get("rawOb"))
        ohne_umgebung = [g for g in erscheinungen if not g.lstrip("-+").startswith("VC")]
        druck = eintrag.get("altim")
        ausgabe[zeit.isoformat()] = {
            "observed_at": zeit.strftime("%Y-%m-%dT%H:%M:%S") + "Z",
            "source": "metar",
            "temperature_c": _zahl(eintrag.get("temp")),
            "dewpoint_c": _zahl(eintrag.get("dewp")),
            "pressure_hpa": _zahl(druck) if druck is not None and 850 <= float(druck) <= 1100 else None,
            "gust_kn": _zahl(eintrag.get("wgst")),
            "visibility_m": _sicht_aus_rohtext(eintrag.get("rawOb")),
            "ceiling_ft": _wolkenuntergrenze(eintrag.get("clouds")),
            "precipitation": any(NIEDERSCHLAG.search(g) for g in ohne_umgebung),
            "thunderstorm": any("TS" in g for g in ohne_umgebung),
            "phenomena": " ".join(erscheinungen)[:40] or None,
        }
    return list(ausgabe.values())


def _zahl(wert):
    return None if wert is None else float(wert)


def metar_rohdaten_holen(icao="EDDF", stunden=24):
    return json.loads(abrufen(metar_url(icao, stunden)))


def metar_holen(icao="EDDF", stunden=24):
    return metar_parsen(metar_rohdaten_holen(icao, stunden))
