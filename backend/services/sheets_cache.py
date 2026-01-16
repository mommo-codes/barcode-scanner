import time
import threading
import gspread
from google.oauth2.service_account import Credentials

SHEET_ID = "12p32y4q_UrdaK3SvMutiflX0ukFQ8IJgP8hRaNwOvuE"

REGISTER_GID = 1645599058
CATALOG_GID = 886259106

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]

SERVICE_ACCOUNT_FILE = "backend/secrets/service_account.json"
CACHE_REFRESH_SECONDS = 30 * 60  # 30 minutes

_cache = {
    "register": {},  # gtin14 -> { uploaded_catalog, uploaded_register }
    "catalog": set(),  # gtin14
    "all_gtins": set(),  # gtin14 (same as catalog sheet)
}


# --- Normalize to GTIN-14 ---
def normalize(gtin: str) -> str:
    gtin = gtin.strip()
    if len(gtin) == 13:
        return "0" + gtin
    return gtin


# --- Normalize header names (CRITICAL FIX) ---
def _normalize_header(h: str) -> str:
    return h.strip().lower().replace("_", " ")


def _find_col(headers: list[str], wanted: str) -> int | None:
    wanted_norm = _normalize_header(wanted)
    for i, h in enumerate(headers):
        if _normalize_header(h) == wanted_norm:
            return i
    return None


def _get_bool(row: list[str], idx: int | None) -> bool:
    """Safely read a TRUE/FALSE cell from a row."""
    if idx is None or idx >= len(row):
        return False
    return row[idx].strip().upper() == "TRUE"


def load_cache():
    print("🔄 Refreshing Google Sheets cache...")

    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)

    sh = gc.open_by_key(SHEET_ID)

    register_ws = sh.get_worksheet_by_id(REGISTER_GID)
    catalog_ws = sh.get_worksheet_by_id(CATALOG_GID)

    register_rows = register_ws.get_all_values()
    catalog_rows = catalog_ws.get_all_values()

    print(f"📄 Register rows loaded: {len(register_rows)}")
    print(f"📄 Catalog rows loaded: {len(catalog_rows)}")

    # --- Header-based column lookup (ROBUST) ---
    headers = register_rows[0]

    idx_uploaded_catalog = _find_col(headers, "Uppladdad_i_Catalog")
    idx_uploaded_register = _find_col(headers, "Uppladdad_i_Register")

    print(
        "🧭 Header indexes | "
        f"Uppladdad_i_Catalog={idx_uploaded_catalog}, "
        f"Uppladdad_i_Register={idx_uploaded_register}"
    )

    if idx_uploaded_catalog is None or idx_uploaded_register is None:
        print("⚠️ WARNING: One or more required columns not found by name")

    # --- Register ---
    reg = {}
    for row in register_rows[1:]:
        if not row or not row[0]:
            continue

        gtin = normalize(row[0])

        uploaded_catalog = _get_bool(row, idx_uploaded_catalog)
        uploaded_register = _get_bool(row, idx_uploaded_register)

        reg[gtin] = {
            "uploaded_catalog": uploaded_catalog,
            "uploaded_register": uploaded_register,
        }

    # --- Catalog / All GTINs (same sheet) ---
    cat = set()
    all_gtins = set()

    for row in catalog_rows[1:]:
        if row and row[0]:
            gtin = normalize(row[0])
            cat.add(gtin)
            all_gtins.add(gtin)

    _cache["register"] = reg
    _cache["catalog"] = cat
    _cache["all_gtins"] = all_gtins

    print(f"✅ Cache loaded: " f"{len(reg)} register, " f"{len(cat)} catalog/all_gtins")


def background_refresh():
    while True:
        try:
            load_cache()
        except Exception as e:
            print("❌ Cache refresh failed:", e)

        time.sleep(CACHE_REFRESH_SECONDS)


# Start background thread on import
threading.Thread(target=background_refresh, daemon=True).start()


def get_cache():
    return _cache
