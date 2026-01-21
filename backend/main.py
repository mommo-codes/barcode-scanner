from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from backend.routes.scan import router as scan_router
from backend.routes.country import router as country_router
import os

app = FastAPI()

# CORS (phone + ngrok safe) # a bit unsure, learn more about this code.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# frontend
BASE_DIR = os.path.dirname(__file__)
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app.mount("/frontend", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


# Redirect root → frontend
@app.get("/")
def root():
    return RedirectResponse("/frontend/")


# API routes
app.include_router(scan_router)
app.include_router(country_router)
