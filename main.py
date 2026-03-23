"""Root compatibility entrypoint.

This keeps the old `uvicorn main:app` flow working while the project
gradually moves toward the gateway/services layout.
"""

from gateway.main import app

