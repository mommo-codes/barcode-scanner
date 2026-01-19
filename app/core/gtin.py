def normalize_gtin(gtin: str) -> str:
    gtin = gtin.strip()
    if len(gtin) == 13:
        return "0" + gtin
    return gtin
