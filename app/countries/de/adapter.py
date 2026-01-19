# app/countries/de/adapter.py
from app.countries.base import CountryAdapter


class GermanyAdapter(CountryAdapter):
    def get_register_entry(self, gtin: str):
        return None

    def in_catalog(self, gtin: str) -> bool:
        return False

    def in_all_gtins(self, gtin: str) -> bool:
        return False
