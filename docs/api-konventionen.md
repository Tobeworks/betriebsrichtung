# API-Konventionen (Phase 0)

Stand: 2026-10-16. Gesichtet im Repo `/Users/tobe/Sites/tobeworks_projects/api`. Dieses Dokument hält fest, was die bestehende API tatsächlich tut, und welche Entscheidung für das Modul `api_betriebsrichtung.py` gilt, wenn die Konvention nicht passt.

## Laufzeit

- Flask 3.0 mit Flask-RESTful (`Api`, Ressourcen als Klassen), Start über `gunicorn server:app --workers 3 --preload --timeout 600`.
- Docker-Basis `python:3.11-slim`, Port 5000.
- Abhängigkeiten: PyJWT 2.6, bcrypt 4.1.2, jsonschema 4.23, mysql-connector-python 9.2, pydantic 2.10.6, Flask-Cors 4.0.0.

## Routen und Registrierung

- Kein Blueprint. Jedes Modul definiert `Resource`-Klassen, `server.py` registriert sie mit `api.add_resource(Klasse, pfad, endpoint=name)`.
- Präfixe der Bestandsrouten: `/interview/...`, `/tobeworks/...`, `/logic-moon/...`, `/handpan/...`, `/blog/...`.
- **Entscheidung:** `api_betriebsrichtung.py` mit `Resource`-Klassen, registriert in `server.py` unter `/betriebsrichtung/v1/...`. Der Plan sprach von einem Blueprint, das passt nicht zur vorhandenen Bauweise.

## CORS

- `server.py` setzt Flask-Cors global auf `*` für alle Pfade außer `/interview/`.
- Eine `after_request`-Funktion setzt danach `Access-Control-Allow-Origin: *` für alle Pfade außer `/interview/`. Sie überschreibt damit jede engere Regel für andere Präfixe.
- **Entscheidung:** Für `/betriebsrichtung/` eine enge Liste erlaubter Ursprünge wie bei `/interview/`, und die Ausnahme in `after_request` um diesen Präfix erweitern. Sonst bleibt der Lesezugriff offen für alle Ursprünge. Für Lesen ist das gewollt (Plan, Frage 13), für Schreiben mit Token nicht nötig, aber unschädlich.

## Authentifizierung

Es gibt vier Muster, keines davon passt für Maschinen-Schreibzugriffe unverändert:

| Muster | Ort | Beschreibung |
|---|---|---|
| JWT Bearer (HS256) | `api/login.py`, Dekorator `login_required` | Benutzer-Token mit `user_id`, `email`, `role`, Ablauf 7 Tage. Geheimnis `JWT_SECRET_KEY`. Jede gültige Benutzer-JWT besteht die Prüfung, es gibt keine Rollenprüfung im Dekorator. |
| Handpan-JWT | `api/handpan_auth.py` | Gleiches Prinzip, Ablauf 30 Tage. |
| Token im Pfad | `api/api_interview.py` | Kundentoken, gespeichert als SHA-256-Hash plus Klartext, optional Passwort im Header `X-Interview-Passwort` (bcrypt). Nur für Kunden-Links. |
| Kein Maschinen-Token | - | Die API hat keinen Token für Jobs oder Dienste. |

**Entscheidung für Schreibzugriffe (`/betriebsrichtung/v1/ingest/*`):**
- Eigener Schreibtoken aus der Umgebungsvariablen `BETRIEBSRICHTUNG_INGEST_TOKEN`, Prüfung per `Authorization: Bearer <token>` und `hmac.compare_digest`.
- Nicht `login_required` verwenden, weil jede Benutzer-JWT dort durchgeht.
- Kein Token im Repo, nur in Kubernetes-Secrets (Netcup-Repo).
- Lesen bleibt ohne Token, wie in Plan Abschnitt 8.

## Fehlerformat

- Bestand: Fehler als `{"status": 0, "error": "<Meldung>"}` mit HTTP-Statuscode. Erfolgsantworten der Auth-Module tragen `"status": 1`.
- Vereinzelt steht stattdessen `"message"` (15 Stellen gefunden), das Format ist also nicht streng einheitlich.
- Interview-Modul: Hilfsfunktion `fehler(text, code)` liefert genau `{"status": 0, "error": text}`. Meldungen sind auf Deutsch.
- **Entscheidung:** `{"status": 0, "error": "<deutsche Meldung>", "code": "<maschinenlesbar>"}`. Das Feld `code` ist neu und additiv. Plan Abschnitt 8 verlangt einen maschinenlesbaren Code, der Bestand hat ihn nicht.
- Ein Stacktrace darf nie nach außen. Unbehandelte Fehler werden zu `500` mit generischer Meldung.

## Paginierung

- Keine einheitliche Konvention. Bestand: feste Grenzen wie `LIMIT 200` (Interview-Admin), `LIMIT 10` (Leaderboard). Die README erwähnt `page_token` und `max_results=200`, das stammt aus einer Supabase-Zeit und ist nicht im Modulcode zu finden.
- **Entscheidung:** `limit` (Standard 100, Höchstwert 500) und `after_id` (Schlüsselpaginierung über die Primärschlüssel-ID, aufsteigend). Die Antwort trägt `next_after_id`, wenn weitere Zeilen folgen. Offset-Paginierung wird nicht verwendet, weil sie bei wachsenden Tabellen Zeilen überspringt oder doppelt liefert.
- Zeiträume bekommen eine Obergrenze pro Anfrage (Plan Abschnitt 8, Vorschlag: 92 Tage für Rohdaten).

## Rate-Limit

- `api/api_rate_limit.py`: gleitendes Fenster von 60 Sekunden im Speicher. Interview-Werte: 120 Lesezugriffe und 60 Schreibzugriffe pro Minute, 10 Fehlversuche pro Minute.
- Client-IP aus dem letzten Eintrag von `X-Forwarded-For` (Traefik setzt ihn selbst).
- **Grenze:** Gunicorn startet 3 Worker. Jeder Worker hat seinen eigenen Zähler, das wirksame Limit ist also bis zu dreimal so hoch. Für Ingest reicht das, weil nur wenige Jobs schreiben. Für öffentliche Lesezugriffe mit Caching (Plan Abschnitt 8) gilt das als bekannte Schwäche, sie wird in Phase 7 mit dem Caching abgewogen (Redis oder ein Zähler pro Worker mit angepasstem Limit).

## Datenbankzugriff

- `api/mysql_config.py`: Singleton `MySQLConfig`, Verbindung mit `autocommit=True`, Zugangsdaten aus `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`.
- `execute_query(sql, params)`: liefert bei SELECT eine Liste von Dictionaries, bei INSERT, UPDATE und DELETE die `lastrowid`. Commit wird nur ausgelöst, wenn das SQL mit einem dieser Schlüsselwörter beginnt. Andere Schreibbefehle (REPLACE, CALL) werden nicht committet.
- Parametrisierte Abfragen mit `%s` durchgängig verwenden.
- **Transaktionen:** Das Interview-Modul (`_speichern`) öffnet sie selbst: `verbindung = db.connect()`, `start_transaction()`, Cursor direkt, `commit()` oder `rollback()`. Dieses Muster übernimmt der Forecast-Lauf (`POST /ingest/forecast-runs`, alles oder nichts).
- Die Verbindung ist ein einzelner Prozess-Singleton ohne Pool. Bei drei Workern hat jeder Worker eine eigene Verbindung.

## Migrationen

- Handgeschriebene `.sql`-Dateien in `migrations/`, ohne Nummerierung, mit `CREATE TABLE IF NOT EXISTS` oder `ALTER`.
- Keine Migrationstabelle, kein Runner. Die Dateien werden von Hand gegen die Datenbank ausgeführt.
- Die Interview-Migration weist im Kopf darauf hin: Nie gegen die Produktion ohne ausdrückliche Anweisung, vorher Dump.
- Bestand: InnoDB, `utf8mb4`, `utf8mb4_unicode_ci`, Zeiten in UTC.
- **Entscheidung (Plan Abschnitt 7a):** Neue Migrationen als `YYYY-MM-DD_NN_name.sql` mit Tabelle `schema_migrations` (Dateiname, Prüfsumme). Das weicht vom Bestand ab und wird im Entscheidungsprotokoll festgehalten.

## Schemas

- `schemas/interview.schema.json` ist eine Kopie. Quelle ist `/Users/tobe/Sites/tobeworks_projects/interview-app/schema/`. Der Test `tests/test_interview_schema_sync.py` vergleicht beide Dateien byteweise und überspringt sich, wenn die Quelle fehlt. Der aktuelle Stand ist identisch.
- Validierung mit `Draft202012Validator` aus `jsonschema`. Der Interview-Code prüft `format` nicht (kein `format_checker`). Plan Abschnitt 5 verlangt die Format-Prüfung in der Validierungsfunktion und einem Test.
- Die Sonderregeln, die JSON-Schema nicht ausdrückt, stehen als Python-Funktion (`definition_pruefen`), nicht nur in der Beschreibung.

## Tests

- pytest, Tests in `tests/`. Die Interview-Tests laufen gegen eine Wegwerf-MySQL 8 auf `127.0.0.1:3306`, Datenbank `interview_test`. Der Fixture bricht ab, wenn die Verbindung auf eine andere Datenbank zeigt.
- Datenbanken: lokaler Entwicklungsserver `local-mysql` auf `127.0.0.1:3306` (Einrichtung in `/Users/tobe/Sites/tools/local-db/README.md`). Kein `docker run` für Tests, auch nicht für einen einzelnen Lauf.
- **Lücke:** `.github/workflows/build.yaml` baut nur das Image und pusht es nach `ghcr.io` (bei Push auf `master`). Die Tests laufen in keiner CI-Stufe. Der CI-Check aus Plan Abschnitt 7d ist neu.

## Logging

- Die API nutzt kein `logging`-Modul. Es gibt rund 48 `print()`-Aufrufe.
- **Entscheidung:** `api_betriebsrichtung.py` und die Jobs nutzen die Standardbibliothek `logging`, Ausgabe als JSON auf stdout mit Korrelations-ID (Plan Abschnitt 9). Der Bestand wird nicht angefasst.

## Caching

- Bestand: keine `Cache-Control`- oder `ETag`-Header.
- Neu für Betriebsrichtung (Plan Abschnitt 8): `ETag`, `Cache-Control: max-age=300, stale-while-revalidate=...` für `current` und `timeline`, länger für `stats` und `evaluation`.

## Git-Regeln der API

- `AGENTS.md`: Conventional Commits, eine Zeile, Footer `Co-Authored-By` entfernen.
- Kein `git push` und kein Deploy ohne ausdrückliche Erlaubnis im jeweiligen Moment. Die API ist produktiv.
- Diese Regel gilt für alle Änderungen dieses Projekts an der API, auch für `api_betriebsrichtung.py`.

## Offen (Phase 0, nicht abschließend geklärt)

- Ob es in der Produktionsdatenbank eine `schema_migrations`-ähnliche Tabelle gibt, ist nicht bekannt. Nachsehen mit `SHOW TABLES` auf einer Kopie, nicht gegen die Produktion ohne Freigabe.
- Ob die Produktionsdatenbank die Datenbank `tobe` ist (siehe `interview-app/docs/OFFEN.md`, Abschnitt 1), ist dort beschrieben, hier nicht geprüft.
- Die Dateien `login.py` und `handpan_auth.py` nutzen unterschiedliche Ablaufzeiten (7 Tage gegenüber 30 Tage). Beabsichtigt ist das nicht belegt.
