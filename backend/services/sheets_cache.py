import time
import threading
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = "12p32y4q_UrdaK3SvMutiflX0ukFQ8IJgP8hRaNwOvuE"
REGISTER_GID = 886259106
CATALOG_GID = 1645599058

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

SERVICE_ACCOUNT_FILE = "secrets/service_account.json"

CACHE_REFRESH_SECONDS = 600  # refresh every 10 minutes

_cache = {
    "register": {},  # gtin14 -> uploaded(bool)
    "catalog": set(),  # gtin14
}


# --- Normalize to GTIN-14 ---
def normalize(gtin: str) -> str:
    gtin = gtin.strip()
    if len(gtin) == 13:
        return "0" + gtin
    return gtin


def load_cache():
    print("🔄 Refreshing Google Sheets cache...")

    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)

    sh = gc.open_by_key(SHEET_ID)
    register_ws = sh.get_worksheet_by_id(REGISTER_GID)
    catalog_ws = sh.get_worksheet_by_id(CATALOG_GID)

    register_rows = register_ws.get_all_values()
    catalog_rows = catalog_ws.get_all_values()

    reg = {}
    for row in register_rows[1:]:
        if not row or not row[0]:
            continue

        gtin = normalize(row[0])
        uploaded = False

        if len(row) >= 7:
            uploaded = row[6].strip().upper() == "TRUE"

        reg[gtin] = uploaded

    cat = set()
    for row in catalog_rows[1:]:
        if row and row[0]:
            cat.add(normalize(row[0]))

    _cache["register"] = reg
    _cache["catalog"] = cat

    print(f"✅ Cache loaded: {len(reg)} register, {len(cat)} catalog")


def background_refresh():
    while True:
        try:
            load_cache()
        except Exception as e:
            print("❌ Cache refresh failed:", e)

        time.sleep(CACHE_REFRESH_SECONDS)


# start background thread on import
threading.Thread(target=background_refresh, daemon=True).start()


def get_cache():
    return _cache
