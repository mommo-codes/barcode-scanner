from app.datasources.google_sheets import GoogleSheetsCache


class SwedenAdapter:
    def __init__(self):
        self._cache = GoogleSheetsCache(
            sheet_id="12p32y4q_UrdaK3SvMutiflX0ukFQ8IJgP8hRaNwOvuE",
            register_gid=1645599058,
            catalog_gid=886259106,
        )
        self._cache.start()

    def get_register_entry(self, gtin: str) -> dict | None:
        return self._cache.get_register().get(gtin)

    def in_catalog(self, gtin: str) -> bool:
        return gtin in self._cache.get_catalog()

    def in_all_gtins(self, gtin: str) -> bool:
        return gtin in self._cache.get_all_gtins()
