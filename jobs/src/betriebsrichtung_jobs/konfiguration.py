import hashlib
import json
import os
from pathlib import Path

from .generated.forecast_config import PrognoseKonfiguration

STANDARD_PFAD = Path(__file__).resolve().parents[2] / "config" / "forecast.json"


def laden(pfad=None):
    pfad = Path(os.environ.get("BETRIEBSRICHTUNG_CONFIG", pfad or STANDARD_PFAD))
    inhalt = json.loads(pfad.read_text(encoding="utf-8"))
    PrognoseKonfiguration.model_validate(inhalt)
    dec = inhalt["decision"]
    if dec["east_on_tailwind_kn"] <= dec["west_back_tailwind_kn"]:
        raise ValueError("east_on_tailwind_kn muss größer als west_back_tailwind_kn sein")
    return inhalt


def hash_von(inhalt):
    kanonisch = json.dumps(inhalt, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(kanonisch.encode("utf-8")).hexdigest()
