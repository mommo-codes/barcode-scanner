from fastapi import APIRouter
from app.countries.registry import list_countries

router = APIRouter(prefix="/api/countries", tags=["countries"])


@router.get("")
def get_countries():
    return {"countries": list_countries()}
