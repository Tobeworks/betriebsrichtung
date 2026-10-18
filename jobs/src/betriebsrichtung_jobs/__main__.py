import argparse
import json
import os
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import api, archiv, konfiguration, modell, quellen

JOB_VERSION = "1.2.2"
ENV_DATEI = Path(__file__).resolve().parents[2] / ".env"


def umgebung_laden(pfad=ENV_DATEI):
    if not pfad.exists():
        return
    for zeile in pfad.read_text(encoding="utf-8").splitlines():
        zeile = zeile.strip()
        if not zeile or zeile.startswith("#") or "=" not in zeile:
            continue
        schluessel, wert = zeile.split("=", 1)
        os.environ.setdefault(schluessel.strip(), wert.strip())


def jetzt():
    return datetime.now(timezone.utc).replace(microsecond=0)


def jobprotokoll(name, start, status, gelesen, geschrieben, fehler):
    ende = jetzt()
    return {
        "job_name": name,
        "started_at": modell.iso(start),
        "finished_at": modell.iso(ende),
        "status": status,
        "rows_read": gelesen,
        "rows_written": geschrieben,
        "error_text": fehler,
        "job_version": JOB_VERSION,
        "correlation_id": uuid.uuid4().hex[:16],
    }


def protokollieren(basis, token, eintrag):
    api.senden(basis, token, "job-runs", [eintrag])


def metar(args):
    start = jetzt()
    status, fehler, geschrieben, gelesen = "ok", None, 0, 0
    try:
        beobachtungen = quellen.metar_holen(stunden=args.stunden)
        gelesen = len(beobachtungen)
        nutzlast = [{**b, "recorded_at": modell.iso(start)} for b in beobachtungen]
        fenster = modell.schaetze_fenster(beobachtungen, konfiguration.laden(), start)
        if args.trockenlauf:
            print(json.dumps({"beobachtungen": len(nutzlast), "geschaetzte_fenster": fenster, "beispiel": nutzlast[:2]},
                             ensure_ascii=False, indent=2))
            return 0
        basis, token = api.konfiguration_aus_umgebung()
        antwort = api.senden(basis, token, "wind-observations", nutzlast)
        geschrieben = antwort.get("neu", 0)
        if fenster:
            try:
                api.senden(basis, token, "slot-actuals", fenster)
            except Exception as ausnahme:
                status, fehler = "partial", f"slot-actuals: {ausnahme}"
                print(f"metar: Schätzung nicht gespeichert: {ausnahme}", file=sys.stderr)
        protokollieren(basis, token, jobprotokoll("metar", start, status, gelesen, geschrieben, fehler))
        return 0
    except Exception as ausnahme:
        status, fehler = "failed", str(ausnahme)
        print(f"metar fehlgeschlagen: {fehler}", file=sys.stderr)
        if not args.trockenlauf:
            basis, token = api.konfiguration_aus_umgebung()
            protokollieren(basis, token, jobprotokoll("metar", start, status, gelesen, geschrieben, fehler))
        return 1


def prognose(args):
    start = jetzt()
    beginn = time.monotonic()
    konf = konfiguration.laden()
    chash = konfiguration.hash_von(konf)
    fehler_liste = []
    laeufe = []
    for modellangabe in konf["models"]:
        try:
            laeufe.append(quellen.ensemble_holen(modellangabe["id"], konf["airport"]["latitude"],
                                                  konf["airport"]["longitude"]))
        except Exception as ausnahme:
            fehler_liste.append(f"{modellangabe['id']}: {ausnahme}")
    fehler = "; ".join(fehler_liste) or None
    gelesen = sum(len(l.zeiten) * len(l.geschwindigkeiten) for l in laeufe)
    if not laeufe:
        print(f"forecast fehlgeschlagen: {fehler}", file=sys.stderr)
        if not args.trockenlauf:
            basis, token = api.konfiguration_aus_umgebung()
            protokollieren(basis, token, jobprotokoll("forecast", start, "failed", 0, 0, fehler))
        return 1

    prognosen, aggregate = modell.berechnen(laeufe, konf, start, chash)
    run = {
        "run_date": start.astimezone(modell.BERLIN).date().isoformat(),
        "run_seq": args.lauf_nummer,
        "config_hash": chash,
        "computed_at": modell.iso(start),
        "status": "partial" if fehler else "ok",
        "duration_ms": int((time.monotonic() - beginn) * 1000),
        "models": [
            {"model": l.model, "init_time": modell.iso(start), "members": len(l.geschwindigkeiten)} for l in laeufe
        ],
    }
    if args.trockenlauf:
        print(json.dumps({
            "run": run,
            "forecasts": len(prognosen),
            "wind_aggregates": len(aggregate),
            "fehler": fehler,
            "beispiel": prognosen[:3],
        }, ensure_ascii=False, indent=2))
        return 0

    archiv_pfad = args.archiv or os.environ.get("BETRIEBSRICHTUNG_ARCHIV_DIR")
    basis, token = api.konfiguration_aus_umgebung()
    api.senden(basis, token, "forecast-configs", {
        "config_hash": chash,
        "version": konf["version"],
        "content": konf,
        "created_at": modell.iso(start),
        "change_note": "Konfiguration aus jobs/config/forecast.json",
    })
    antwort = api.senden(basis, token, "forecast-runs", {"run": run, "forecasts": prognosen,
                                                          "wind_aggregates": aggregate})
    if archiv_pfad and antwort.get("ergebnis") == "angelegt":
        archiv.schreiben(archiv_pfad, start.astimezone(modell.BERLIN).date(), args.lauf_nummer, {
            "computed_at": modell.iso(start),
            "modelle": [
                {"model": l.model, "zeiten": [modell.iso(z) for z in l.zeiten],
                 "geschwindigkeiten": l.geschwindigkeiten, "richtungen": l.richtungen}
                for l in laeufe
            ],
        })
    geschrieben = antwort.get("forecasts", 0) + antwort.get("wind_aggregates", 0)
    protokollieren(basis, token, jobprotokoll("forecast", start, run["status"], gelesen, geschrieben, fehler))
    return 0


def main(argv=None):
    umgebung_laden()
    parser = argparse.ArgumentParser(prog="betriebsrichtung_jobs")
    unter = parser.add_subparsers(dest="befehl", required=True)

    metar_parser = unter.add_parser("metar", help="METAR EDDF als Winddaten speichern")
    metar_parser.add_argument("--trockenlauf", action="store_true", help="nur abrufen und ausgeben, nichts schreiben")
    metar_parser.add_argument("--stunden", type=int, default=24, choices=range(1, 169), metavar="1-168",
                              help="wie viele Stunden zurück die Meldungen geholt werden (für einen Nachtrag)")
    metar_parser.set_defaults(ausfuehren=metar)

    prognose_parser = unter.add_parser("forecast", help="Ensemble-Läufe holen, rechnen und speichern")
    prognose_parser.add_argument("--lauf-nummer", type=int, required=True, choices=range(1, 100), metavar="1-99")
    prognose_parser.add_argument("--archiv", help="Verzeichnis für die Rohdaten (sonst BETRIEBSRICHTUNG_ARCHIV_DIR)")
    prognose_parser.add_argument("--trockenlauf", action="store_true", help="rechnen und ausgeben, nichts schreiben")
    prognose_parser.set_defaults(ausfuehren=prognose)

    args = parser.parse_args(argv)
    return args.ausfuehren(args)


if __name__ == "__main__":
    sys.exit(main())
