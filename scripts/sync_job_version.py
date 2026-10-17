"""Setzt JOB_VERSION in den Jobs auf die Version aus frontend/package.json (einzige Quelle der Version)."""
import json
import re
from pathlib import Path

WURZEL = Path(__file__).resolve().parents[1]
DATEI = WURZEL / "jobs" / "src" / "betriebsrichtung_jobs" / "__main__.py"

version = json.loads((WURZEL / "frontend" / "package.json").read_text(encoding="utf-8"))["version"]
DATEI.write_text(
    re.sub(r'JOB_VERSION = "[^"]*"', f'JOB_VERSION = "{version}"', DATEI.read_text(encoding="utf-8"), count=1),
    encoding="utf-8",
)
