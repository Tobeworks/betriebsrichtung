"""Setzt JOB_VERSION in den Jobs auf die Version aus frontend/package.json (wird von release-it aufgerufen)."""
import re
import sys
from pathlib import Path

DATEI = Path(__file__).resolve().parents[1] / "jobs" / "src" / "betriebsrichtung_jobs" / "__main__.py"

neu = re.sub(r'JOB_VERSION = "[^"]*"', f'JOB_VERSION = "{sys.argv[1]}"', DATEI.read_text(encoding="utf-8"), count=1)
DATEI.write_text(neu, encoding="utf-8")
