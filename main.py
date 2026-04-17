"""Root compatibility entrypoint.

This keeps the old `uvicorn main:app` flow working while the project
gradually moves toward the gateway/services layout.
"""

from __future__ import annotations

import asyncio
import sys

# On Windows, asyncio's default ProactorEventLoop can emit a noisy
# ConnectionResetError traceback when clients disconnect.
# The selector event loop avoids the spurious callback error.
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:
        pass

from gateway.main import app
