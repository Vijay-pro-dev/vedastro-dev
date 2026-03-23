# Vedastro Project Structure

This repo is organized so backend and frontend responsibilities stay easy to follow.

## Project Overview

Vedastro ek full-stack SaaS web application hai jo secure auth, multilingual onboarding, saved profiles, AI-style dashboard insights, aur admin tooling provide karta hai.

### Core Features

- Secure JWT authentication with protected routes.
- Signup and login flow with nationality-based language selection.
- Saved profile system so users ko dubara data fill nahi karna padta.
- Multilingual UI support: English, Hindi, French, German, Arabic.
- Career dashboard with AI-style scores, guidance, opportunity window, aur trend visuals.
- Profile page with edit/save, image upload, and validation.
- Landing page with role-aware navigation.

### Admin Features

- Dedicated admin login and admin panel.
- User management: view, suspend, unsuspend, delete, role change.
- Activity logs with recent view, full history, delete one, delete all.
- Export users to CSV.
- User statistics, completion rate, activity summaries, and charts.
- Direct user profile inspection from admin panel.

### Security Features

- JWT access and refresh token flow.
- Password reset flow.
- Email verification flow.
- Login attempt lockout.
- Request logging and security logging.
- Basic security middleware and rate limiting support.
- Environment-based configuration for dev and production.

### Engineering Quality

- Backend organized into `core`, `models`, `schemas`, and shared services.
- Feature routers live in service folders under `services/`.
- Frontend organized into `pages`, `components`, `context`, and `lib`.
- Lazy-loaded frontend routes.
- Toast-based error and success handling.
- API testing collection available.
- Backend API tests included.
- Docker support for development and production workflows.

## Folders

- `app/`
  - Shared FastAPI backend core, models, schemas, and business helpers
- `frontend/`
  - React + Vite frontend
  - dev and production frontend Docker files
- `services/`
  - feature routers and service entrypoints
- `gateway/`
  - API gateway entrypoint
- `shared/`
  - common helpers used by multiple services
- `docker-compose.yml`
  - development Docker workflow with live code updates
- `docker-compose.prod.yml`
  - production-oriented Docker workflow

## Project Flow

The project has two main parts:

- `app/`
  - shared backend core, database, models, schemas, and helpers
- `services/`
  - auth, dashboard, profile, admin, and other feature routers
- `frontend/`
  - React UI for landing page, login, signup, profile, dashboard, and admin panel

High-level user flow:

1. User lands on the frontend.
2. User signs up or logs in.
3. Backend returns a JWT token.
4. User completes profile data.
5. Backend saves profile data in the database.
6. Dashboard fetches analysis and recommendations from the backend.
7. On future logins, saved profile and dashboard data are loaded again.

High-level admin flow:

1. Admin logs in.
2. Admin panel loads user stats and activity logs.
3. Admin can inspect users, update roles, suspend users, delete users, and export data.

## Microservices Layout

The repo is now organized in a microservices-style layout:

- `gateway/`
  - API gateway entrypoint
- `services/auth/`
  - auth service entrypoint and auth router
- `services/health/`
  - health and readiness service
- `services/career/`
  - career dashboard and profile routers
- `services/admin/`
  - admin service entrypoint and admin router
- `services/relationship/`
  - future service scaffold
- `services/finance/`
  - future service scaffold
- `shared/`
  - shared helpers for the service split

The running behavior stays the same, but the code now lives in the folder that matches its responsibility.

## Email Setup

Password reset and email verification are already wired into the backend.

- In local development, the backend can generate tokens and return them in responses for easy testing.
- In production, set SMTP values so the backend can send real emails and stop exposing tokens in the UI.

Required backend env keys:

```bash
FRONTEND_BASE_URL=https://your-frontend-domain.com
EMAIL_FROM=no-reply@vedastro.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USERNAME=your-smtp-username
SMTP_PASSWORD=your-smtp-password
SMTP_USE_TLS=true
```

What these are used for:

- `FRONTEND_BASE_URL`
  - builds the reset and verification links sent to users
- `EMAIL_FROM`
  - sender address shown in outgoing mail
- `SMTP_*`
  - enables password reset and email verification delivery

If SMTP is not configured, the app still works, but the reset and verification emails will not be sent automatically.

## Important Backend Files

- `app/main.py`
  - creates the FastAPI app, mounts middleware, routes, logging, and startup logic
- `app/core/config.py`
  - loads env-based settings
- `app/core/database.py`
  - creates database engine and session
- `app/core/security.py`
  - JWT and password helpers
- `app/core/security_middleware.py`
  - request security and rate-limiting middleware
- `services/auth/router.py`
  - auth API endpoints
- `services/career/router.py`
  - dashboard and career API endpoints
- `services/career/profile_router.py`
  - profile API endpoints
- `services/admin/router.py`
  - admin API endpoints
- `app/services/`
  - business logic
- `app/models/user.py`
  - database models
- `alembic/`
  - database migrations
- `tests/`
  - backend API tests

## Important Frontend Files

- `frontend/src/App.jsx`
  - route definitions
- `frontend/src/context/UserContext.jsx`
  - user session, token state, and translation-aware app state
- `frontend/src/lib/api.js`
  - API client
- `frontend/src/lib/i18n.js`
  - multilingual UI helper
- `frontend/src/pages/`
  - route-level screens
- `frontend/src/components/shared/`
  - shared route guards
- `frontend/src/components/dashboard/`
  - dashboard-only UI pieces
- `frontend/src/components/profile/`
  - profile flow helpers

## Data Locations

- `storage/users.db`
  - local SQLite database for development
- `storage/uploads/`
  - uploaded profile images and related files
- `logs/backend.log`
  - request and application log file
- `logs/backend.err.log`
  - security and error log file

## Common Commands

Development with Docker:

```bash
docker compose up --build
```

Backend tests:

```bash
..\venv\Scripts\python.exe -m pytest -q
```

Backend dev server:

```bash
..\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend build:

```bash
cd frontend
npm run build
```

Frontend dev server:

```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

## Adding New Features

- For a new backend API:
- add route logic in `services/`
  - add business logic in `app/services/`
  - add request/response schemas in `app/schemas/`
- For a database change:
  - update models in `app/models/`
  - create or update Alembic migration files
- For a new frontend screen:
  - add a file in `frontend/src/pages/`
- For reusable frontend UI:
  - add components in `frontend/src/components/`
- For shared frontend helpers:
  - use `frontend/src/lib/` or `frontend/src/context/`

## Project Rules

- Keep route files focused on request and response handling.
- Keep service files focused on business logic.
- Keep models for database structure only.
- Keep pages for full screens and components for reusable UI.
- Run backend tests and frontend build after major changes.
