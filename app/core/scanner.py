from app.core.status import classify
from app.core.gtin import normalize_gtin


class Scanner:
    def __init__(self, country_adapter):
        self._country = country_adapter

    def scan(self, raw_gtin: str) -> dict:
        gtin = normalize_gtin(raw_gtin)

        entry = self._country.get_register_entry(gtin)

        in_register = entry is not None
        in_catalog = self._country.in_catalog(gtin)
        in_all_gtins = self._country.in_all_gtins(gtin)

        uploaded_catalog = entry["uploaded_catalog"] if entry else False
        uploaded_register = entry["uploaded_register"] if entry else False

        status = classify(
            in_register=in_register,
            in_catalog=in_catalog,
            in_all_gtins=in_all_gtins,
            uploaded_catalog=uploaded_catalog,
            uploaded_register=uploaded_register,
        )

        name = None
        if status in ("green", "yellow"):
            name = entry.get("name") if entry and entry.get("name") else "Name Missing"

        return {
            "gtin": gtin,
            "status": status,
            "name": name,
        }
