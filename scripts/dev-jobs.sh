#!/bin/sh
# Startet einen Job lokal wie der CronJob: dev-jobs.sh metar|forecast [Optionen]
# Nimmt jobs/.venv, wenn es sie gibt, sonst python3 (oder PYTHON=/pfad/zu/python).
cd "$(dirname "$0")/../jobs" || exit 1
PYTHON=${PYTHON:-.venv/bin/python}
[ -x "$PYTHON" ] || PYTHON=python3
export PYTHONPATH=src

job=$1
shift
if [ "$job" = forecast ]; then
  case " $* " in
    *" --lauf-nummer "*) ;;
    # ponytail: Nummer aus der Minute seit Epoche (4 bis 99), damit wiederholte Läufe am selben Tag nicht als "vorhanden" enden.
    # Kein date +%H oder +%M: "08" und "09" liest die Shell als ungültige Oktalzahl.
    *) set -- --lauf-nummer "$(( $(date +%s) / 60 % 96 + 4 ))" "$@" ;;
  esac
fi
exec "$PYTHON" -m betriebsrichtung_jobs "$job" "$@"
