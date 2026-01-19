from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse

from app.router import register_routes
import os


def create_app() -> FastAPI:
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_routes(app)

    # ---- Serve frontend (single URL) ----
    BASE_DIR = os.path.dirname(__file__)
    FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

    app.mount(
        "/frontend", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend"
    )

    @app.get("/")
    def root():
        return RedirectResponse("/frontend/")

    return app


app = create_app()
