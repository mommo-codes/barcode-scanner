from fastapi import APIRouter

router = APIRouter(prefix="/api/country", tags=["country"])


@router.get("")
def get_country():
    return {"country": "SE"}
