import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = Path(os.environ.get("SCHEMA_DIR", ROOT / "schemas" / "betriebsrichtung"))
TS_OUT = ROOT / "frontend" / "src" / "api" / "generated"
PY_OUT = ROOT / "jobs" / "src" / "betriebsrichtung_jobs" / "generated"
TS_CLI = "json-schema-to-typescript@16.0.0"


def _py_kopie(quelle, ziel):
    for schema in sorted(quelle.glob("*.schema.json")):
        name = schema.name.removesuffix(".schema.json").replace(".", "_")
        text = schema.read_text(encoding="utf-8").replace(".schema.json", ".json")
        (ziel / f"{name}.json").write_text(text, encoding="utf-8")


def main():
    if not SCHEMA_DIR.exists():
        print(f"Quelle {SCHEMA_DIR} fehlt, Abgleich übersprungen", file=sys.stderr)
        return 0

    for ziel in (TS_OUT, PY_OUT):
        if ziel.exists():
            shutil.rmtree(ziel)
        ziel.mkdir(parents=True)

    for schema in sorted(SCHEMA_DIR.glob("*.schema.json")):
        ausgabe = TS_OUT / schema.name.replace(".schema.json", ".d.ts")
        subprocess.run(
            ["npx", "--yes", TS_CLI, str(schema), "--bannerComment", "", "-o", str(ausgabe)],
            check=True,
        )

    with tempfile.TemporaryDirectory() as tmp:
        kopie = Path(tmp)
        _py_kopie(SCHEMA_DIR, kopie)
        subprocess.run(
            [
                "datamodel-codegen",
                "--input", str(kopie),
                "--input-file-type", "jsonschema",
                "--output", str(PY_OUT),
                "--output-model-type", "pydantic_v2.BaseModel",
                "--disable-timestamp",
                "--use-standard-collections",
                "--collapse-root-models",
            ],
            check=True,
        )

    (PY_OUT / "__init__.py").write_text("", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
