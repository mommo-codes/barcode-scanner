from app.countries.se.adapter import SwedenAdapter

_COUNTRIES = {
    "se": SwedenAdapter(),
}


def get_country_adapter(code: str):
    code = code.lower()
    if code not in _COUNTRIES:
        raise ValueError(f"Unsupported country: {code}")
    return _COUNTRIES[code]


def list_countries() -> list[str]:
    return list(_COUNTRIES.keys())
