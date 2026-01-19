from abc import ABC, abstractmethod


class CountryAdapter(ABC):
    code: str

    @abstractmethod
    def get_register_entry(self, gtin: str) -> dict | None:
        pass

    @abstractmethod
    def in_catalog(self, gtin: str) -> bool:
        pass

    @abstractmethod
    def in_all_gtins(self, gtin: str) -> bool:
        pass
