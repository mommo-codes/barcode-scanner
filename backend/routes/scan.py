from fastapi import APIRouter
from pydantic import BaseModel
from services.sheets_cache import get_cache
from services.sheets_cache import normalize


router = APIRouter(prefix="/api", tags=["scan"])


class ScanRequest(BaseModel):
    gtin: str


@router.post("/check-gtin")
def check_gtin(req: ScanRequest):
    gtin = normalize(req.gtin)

    cache = get_cache()

    in_register = gtin in cache["register"]
    in_catalog = gtin in cache["catalog"]
    uploaded = cache["register"].get(gtin, False)

    # RED
    if not in_register and not in_catalog:
        status = "red"

    # GREEN
    elif in_register and in_catalog:
        status = "green"

    # YELLOW (hanging)
    else:
        status = "yellow"

    return {
        "gtin": gtin,
        "in_register": in_register,
        "in_catalog": in_catalog,
        "uploaded": uploaded,
        "status": status,
    }
