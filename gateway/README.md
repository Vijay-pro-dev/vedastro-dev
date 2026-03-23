# Gateway

This folder is the API gateway entrypoint for Vedastro.

Current state:
- It re-exports the working FastAPI app from `app/main.py`.
- It gives us a clean place to move toward a microservices layout later.

Run locally:
```powershell
uvicorn gateway.main:app --reload --host 127.0.0.1 --port 8000
```
