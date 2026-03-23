# Backend

## Key Folders

- `app/core`
  - settings, database, security, middleware
- `app/models`
  - SQLAlchemy models
- `app/routes`
  - API route handlers
- `app/schemas`
  - request and response schemas
- `app/services`
  - business logic and shared helpers
- `alembic`
  - database migrations
- `tests`
  - backend API flow tests

## Important Files

- `main.py`
  - thin ASGI entrypoint
- `start.py`
  - container startup helper for migrations + API boot
- `.env.dev`
  - development config
- `.env.prod`
  - production config
