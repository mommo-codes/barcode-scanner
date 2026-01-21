from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.sheets_cache import get_cache, normalize

router = APIRouter(prefix="/api", tags=["scan"])


class ScanRequest(BaseModel):
    gtin: str


@router.post("/check-gtin")
def check_gtin(req: ScanRequest):
    gtin = normalize(req.gtin)
    cache = get_cache()

    entry = cache["register"].get(gtin)

    in_register = entry is not None
    in_catalog = gtin in cache["catalog"]
    in_all_gtins = gtin in cache["all_gtins"]

    uploaded_catalog = entry["uploaded_catalog"] if entry else False
    uploaded_register = entry["uploaded_register"] if entry else False

    # green
    if in_register and in_catalog and uploaded_catalog and uploaded_register:
        status = "green"

    # yellow
    elif in_register and (not uploaded_catalog or not uploaded_register):
        status = "yellow"

    # orange
    elif in_all_gtins and not in_register:
        status = "orange"

    # red
    else:
        status = "red"

    # name logic
    name = None

    if status == "green":
        name = entry["name"] if entry and entry.get("name") else "Name Missing"

    elif status == "yellow":
        name = entry["name"] if entry and entry.get("name") else "Name Missing"

    return {
        "gtin": gtin,
        "status": status,  # background color
        "name": name,  # product name or None
    }
