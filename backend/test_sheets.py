import os
import gspread
from google.oauth2.service_account import Credentials

SERVICE_ACCOUNT_FILE = "secrets/service_account.json"

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def main():
    if not os.path.exists(SERVICE_ACCOUNT_FILE):
        raise FileNotFoundError(f"Missing {SERVICE_ACCOUNT_FILE}")

    creds = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(creds)

    # Your Google Sheet FILE ID (not the full URL)
    SHEET_ID = "12p32y4q_UrdaK3SvMutiflX0ukFQ8IJgP8hRaNwOvuE"

    sh = gc.open_by_key(SHEET_ID)

    # Access specific worksheets by GID
    register_ws = sh.get_worksheet_by_id(886259106)
    catalog_ws = sh.get_worksheet_by_id(1645599058)

    print("Sheet title:", sh.title)
    print("Register tab:", register_ws.title)
    print("Catalog tab:", catalog_ws.title)

    print("Register A1:", register_ws.acell("A1").value)
    print("Catalog A1:", catalog_ws.acell("A1").value)


if __name__ == "__main__":
    main()
