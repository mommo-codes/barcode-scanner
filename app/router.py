from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
import os

from app.api.scan import router as scan_router
from app.api.countries import router as countries_router


def register_routes(app: FastAPI) -> None:
    app.include_router(scan_router)
    app.include_router(countries_router)

    base_dir = os.path.dirname(__file__)
    frontend_dir = os.path.join(base_dir, "frontend")

    app.mount(
        "/frontend",
        StaticFiles(directory=frontend_dir, html=True),
        name="frontend",
    )

    @app.get("/")
    def root():
        return RedirectResponse("/frontend/")
