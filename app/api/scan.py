from fastapi import APIRouter
from pydantic import BaseModel

from app.core.scanner import Scanner
from app.countries.registry import get_country_adapter

router = APIRouter(prefix="/api", tags=["scan"])


class ScanRequest(BaseModel):
    gtin: str
    country: str = "se"


@router.post("/check-gtin")
def check_gtin(req: ScanRequest):
    country = get_country_adapter(req.country)
    scanner = Scanner(country)

    return scanner.scan(req.gtin)
