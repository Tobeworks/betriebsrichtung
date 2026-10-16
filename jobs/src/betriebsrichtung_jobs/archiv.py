import gzip
import json
from pathlib import Path


def schreiben(verzeichnis, run_date, run_seq, mitgliederdaten):
    ziel = Path(verzeichnis) / run_date.isoformat()
    ziel.mkdir(parents=True, exist_ok=True)
    datei = ziel / f"lauf-{run_seq:02d}.json.gz"
    with gzip.open(datei, "wt", encoding="utf-8") as ausgabe:
        json.dump(mitgliederdaten, ausgabe, ensure_ascii=False)
    return datei
