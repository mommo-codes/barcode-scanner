import time
import threading
from typing import Dict, Set

import gspread
from google.oauth2.service_account import Credentials
from pathlib import Path


# ------------------------------------------------------------------
# Paths
# ------------------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]  # app/
SERVICE_ACCOUNT_FILE = BASE_DIR / "secrets" / "service_account.json"


# ------------------------------------------------------------------
# Google Sheets Cache
# ------------------------------------------------------------------


class GoogleSheetsCache:
    def __init__(
        self,
        *,
        sheet_id: str,
        register_gid: int,
        catalog_gid: int,
        refresh_seconds: int = 1800,
    ):
        self._sheet_id = sheet_id
        self._register_gid = register_gid
        self._catalog_gid = catalog_gid
        self._refresh_seconds = refresh_seconds

        self._cache: dict[str, object] = {
            "register": {},
            "catalog": set(),
            "all_gtins": set(),
        }

        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start background refresh thread (idempotent)."""
        if self._thread is not None:
            return

        self._thread = threading.Thread(
            target=self._refresh_loop,
            name="google-sheets-cache",
            daemon=True,
        )
        self._thread.start()

    def get_register(self) -> Dict[str, dict]:
        with self._lock:
            return dict(self._cache["register"])

    def get_catalog(self) -> Set[str]:
        with self._lock:
            return set(self._cache["catalog"])

    def get_all_gtins(self) -> Set[str]:
        with self._lock:
            return set(self._cache["all_gtins"])

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _refresh_loop(self) -> None:
        """Load immediately, then refresh periodically."""
        while True:
            try:
                self._load()
            except Exception as e:
                print("Google Sheets refresh failed:", e)
            time.sleep(self._refresh_seconds)

    def _load(self) -> None:
        if not SERVICE_ACCOUNT_FILE.exists():
            raise FileNotFoundError(
                f"Missing service account file: {SERVICE_ACCOUNT_FILE}"
            )

        creds = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=[
                "https://www.googleapis.com/auth/spreadsheets.readonly",
                "https://www.googleapis.com/auth/drive.readonly",
            ],
        )

        client = gspread.authorize(creds)
        sheet = client.open_by_key(self._sheet_id)

        register_ws = sheet.get_worksheet_by_id(self._register_gid)
        catalog_ws = sheet.get_worksheet_by_id(self._catalog_gid)

        register_rows = register_ws.get_all_values() if register_ws else []
        catalog_rows = catalog_ws.get_all_values() if catalog_ws else []

        register = self._parse_register(register_rows)
        catalog = self._parse_catalog(catalog_rows)

        with self._lock:
            self._cache["register"] = register
            self._cache["catalog"] = catalog
            self._cache["all_gtins"] = set(catalog)

        print(
            f"Sheets cache loaded: " f"{len(register)} register, {len(catalog)} catalog"
        )

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    def _parse_register(self, rows: list[list[str]]) -> Dict[str, dict]:
        if not rows:
            return {}

        headers = rows[0]

        idx_catalog = self._find_col(headers, "Uppladdad_i_Catalog")
        idx_register = self._find_col(headers, "Uppladdad_i_Register")
        idx_name = self._find_col(headers, "Golden_Standard_Name")

        data: Dict[str, dict] = {}

        for row in rows[1:]:
            if not row or not row[0].strip():
                continue

            gtin = self._normalize_gtin(row[0])

            data[gtin] = {
                "uploaded_catalog": self._get_bool(row, idx_catalog),
                "uploaded_register": self._get_bool(row, idx_register),
                "name": self._get_str(row, idx_name),
            }

        return data

    def _parse_catalog(self, rows: list[list[str]]) -> Set[str]:
        if not rows:
            return set()

        result: Set[str] = set()

        for row in rows[1:]:
            if row and row[0].strip():
                result.add(self._normalize_gtin(row[0]))

        return result

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_gtin(gtin: str) -> str:
        gtin = gtin.strip()
        return gtin if len(gtin) == 14 else gtin.zfill(14)

    @staticmethod
    def _find_col(headers: list[str], name: str) -> int | None:
        target = name.strip().lower().replace("_", " ")
        for i, h in enumerate(headers):
            if h.strip().lower().replace("_", " ") == target:
                return i
        return None

    @staticmethod
    def _get_bool(row: list[str], idx: int | None) -> bool:
        return idx is not None and idx < len(row) and row[idx].strip().upper() == "TRUE"

    @staticmethod
    def _get_str(row: list[str], idx: int | None) -> str | None:
        if idx is None or idx >= len(row):
            return None
        value = row[idx].strip()
        return value or None
