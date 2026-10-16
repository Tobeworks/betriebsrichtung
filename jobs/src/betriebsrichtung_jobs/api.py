import json
import os
import urllib.error
import urllib.request


class Fehler(RuntimeError):
    pass


def konfiguration_aus_umgebung():
    basis = os.environ.get("BETRIEBSRICHTUNG_API_URL", "").rstrip("/")
    token = os.environ.get("BETRIEBSRICHTUNG_INGEST_TOKEN", "")
    if not basis or not token:
        raise Fehler("BETRIEBSRICHTUNG_API_URL und BETRIEBSRICHTUNG_INGEST_TOKEN müssen gesetzt sein")
    return basis, token


def senden(basis, token, pfad, nutzlast, timeout=60):
    daten = json.dumps(nutzlast, ensure_ascii=False).encode("utf-8")
    anfrage = urllib.request.Request(
        f"{basis}/ingest/{pfad}",
        data=daten,
        method="POST",
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    try:
        with urllib.request.urlopen(anfrage, timeout=timeout) as antwort:
            return json.loads(antwort.read() or b"{}")
    except urllib.error.HTTPError as fehler:
        inhalt = fehler.read().decode("utf-8", errors="replace")
        raise Fehler(f"{pfad} antwortet mit {fehler.code}: {inhalt[:500]}") from fehler
