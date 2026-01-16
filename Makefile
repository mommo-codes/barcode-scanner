.PHONY: help venv install run dev ngrok clean

PYTHON := python3
VENV := .venv
BACKEND := backend
UVICORN := $(VENV)/bin/uvicorn
PIP := $(VENV)/bin/pip
NGROK := ngrok

help:
	@echo ""
	@echo "Available commands:"
	@echo "  make venv      Create virtual environment"
	@echo "  make install   Install backend dependencies"
	@echo "  make run       Run FastAPI server (prod-style)"
	@echo "  make dev       Run FastAPI with reload (dev)"
	@echo "  make ngrok     Expose local server via ngrok"
	@echo "  make clean     Remove venv and caches"
	@echo ""

venv:
	$(PYTHON) -m venv $(VENV)

install:
	$(PIP) install -r requirements.txt

run:
	$(UVICORN) backend.main:app --host 0.0.0.0 --port 8000

dev:
	.venv/bin/python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

ngrok:
	$(NGROK) http 8000

clean:
	rm -rf $(VENV) __pycache__ backend/__pycache__
