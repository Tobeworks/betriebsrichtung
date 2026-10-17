import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_DIR = ROOT / "schemas" / "betriebsrichtung"
MIGRATION = ROOT / "db" / "2026-10-16_01_create_betriebsrichtung.sql"
TABELLEN_ZUSATZ = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
PRELUDE = f"""CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(200) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (filename)
) {TABELLEN_ZUSATZ};
"""


def _erlaubt_null(prop):
    typ = prop.get("type")
    if isinstance(typ, list) and "null" in typ:
        return True
    return any(s.get("type") == "null" for s in prop.get("anyOf", []))


def _spalten(namen):
    return ", ".join(f"`{n}`" for n in namen)


def _tabelle(schema):
    db = schema["x-db"]
    zeilen = []
    for name, prop in schema["properties"].items():
        spalte = f"  `{name}` {prop['x-db']['type']}"
        if prop["x-db"].get("autoIncrement"):
            spalte += " AUTO_INCREMENT"
        spalte += " NULL" if _erlaubt_null(prop) else " NOT NULL"
        zeilen.append(spalte)
    zeilen.append(f"  PRIMARY KEY ({_spalten(db['primaryKey'])})")
    for eintrag in db.get("unique", []):
        zeilen.append(f"  UNIQUE KEY `{eintrag['name']}` ({_spalten(eintrag['columns'])})")
    for eintrag in db.get("indexes", []):
        zeilen.append(f"  KEY `{eintrag['name']}` ({_spalten(eintrag['columns'])})")
    for fk in db.get("foreignKeys", []):
        zeilen.append(
            f"  CONSTRAINT `{fk['name']}` FOREIGN KEY ({_spalten(fk['columns'])}) REFERENCES {fk['references']}"
        )
    return f"CREATE TABLE IF NOT EXISTS `{db['table']}` (\n" + ",\n".join(zeilen) + f"\n) {TABELLEN_ZUSATZ};\n"


def _reihenfolge(schemas):
    tabellen = {s["x-db"]["table"]: s for s in schemas}
    fertig, ausgabe = set(), []
    while len(ausgabe) < len(tabellen):
        fortschritt = False
        for name, schema in tabellen.items():
            if name in fertig:
                continue
            abhaengig = {fk["references"].split("(")[0] for fk in schema["x-db"].get("foreignKeys", [])}
            if abhaengig <= fertig:
                ausgabe.append(schema)
                fertig.add(name)
                fortschritt = True
        if not fortschritt:
            raise SystemExit("Zyklus in den Fremdschlüsseln")
    return ausgabe


def ddl():
    schemas = [
        json.loads(p.read_text(encoding="utf-8"))
        for p in sorted(SCHEMA_DIR.glob("*.schema.json"))
    ]
    entitaeten = [s for s in schemas if "x-db" in s and "table" in s["x-db"]]
    return PRELUDE + "\n" + "\n".join(_tabelle(s) for s in _reihenfolge(entitaeten))


def main():
    parser = argparse.ArgumentParser(description="Erzeugt die DDL der Betriebsrichtungs-Tabellen aus den Schemas.")
    parser.add_argument("--schreiben", action="store_true", help=f"schreibt {MIGRATION.name}")
    parser.add_argument("--pruefen", action="store_true", help="bricht ab, wenn die Migration vom Schema abweicht")
    args = parser.parse_args()
    text = ddl()
    if args.pruefen:
        if not MIGRATION.exists() or MIGRATION.read_text(encoding="utf-8") != text:
            print(f"{MIGRATION.name} weicht vom Schema ab, mit --schreiben neu erzeugen", file=sys.stderr)
            return 1
        return 0
    if args.schreiben:
        MIGRATION.parent.mkdir(parents=True, exist_ok=True)
        MIGRATION.write_text(text, encoding="utf-8")
        return 0
    sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
