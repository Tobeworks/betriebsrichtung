from betriebsrichtung_jobs import konfiguration


def test_mitgelieferte_konfiguration_ist_gueltig_und_hat_stabilen_hash():
    inhalt = konfiguration.laden()
    erster = konfiguration.hash_von(inhalt)
    assert erster == konfiguration.hash_von(dict(reversed(list(inhalt.items()))))
    assert len(erster) == 64
