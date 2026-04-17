"""Gateway entrypoint for Vedastro."""

from __future__ import annotations

import asyncio
import sys

if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from app.main import app
