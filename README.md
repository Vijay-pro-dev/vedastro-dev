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

- Backend organized into `core`, `models`, `routes`, `schemas`, and `services`.
- Frontend organized into `pages`, `components`, `context`, and `lib`.
- Lazy-loaded frontend routes.
- Toast-based error and success handling.
- API testing collection available.
- Backend API tests included.
- Docker support for development and production workflows.

## Folders

- `backend/`
  - FastAPI app
  - Alembic migrations
  - API tests
  - backend Docker files and env templates
- `fastapi-frontend/`
  - React + Vite frontend
  - dev and production frontend Docker files
- `docker-compose.yml`
  - development Docker workflow with live code updates
- `docker-compose.prod.yml`
  - production-oriented Docker workflow

## Project Flow

The project has two main parts:

- `backend/`
  - FastAPI APIs, database access, auth, profile, dashboard, and admin logic
- `fastapi-frontend/`
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

- `backend/main.py`
  - backend entrypoint used when running the API from the `backend/` folder
- `backend/app/main.py`
  - creates the FastAPI app, mounts middleware, routes, logging, and startup logic
- `backend/app/core/config.py`
  - loads env-based settings
- `backend/app/core/database.py`
  - creates database engine and session
- `backend/app/core/security.py`
  - JWT and password helpers
- `backend/app/core/security_middleware.py`
  - request security and rate-limiting middleware
- `backend/app/routes/`
  - API endpoints
- `backend/app/services/`
  - business logic
- `backend/app/models/user.py`
  - database models
- `backend/alembic/`
  - database migrations
- `backend/tests/`
  - backend API tests

## Important Frontend Files

- `fastapi-frontend/src/App.jsx`
  - route definitions
- `fastapi-frontend/src/context/UserContext.jsx`
  - user session, token state, and translation-aware app state
- `fastapi-frontend/src/lib/api.js`
  - API client
- `fastapi-frontend/src/lib/i18n.js`
  - multilingual UI helper
- `fastapi-frontend/src/pages/`
  - route-level screens
- `fastapi-frontend/src/components/shared/`
  - shared route guards
- `fastapi-frontend/src/components/dashboard/`
  - dashboard-only UI pieces
- `fastapi-frontend/src/components/profile/`
  - profile flow helpers

## Data Locations

- `backend/storage/users.db`
  - local SQLite database for development
- `backend/storage/uploads/`
  - uploaded profile images and related files
- `backend/logs/backend.log`
  - request and application log file
- `backend/logs/backend.err.log`
  - security and error log file

## Common Commands

Development with Docker:

```bash
docker compose up --build
```

Backend tests:

```bash
cd backend
..\venv\Scripts\python.exe -m pytest -q
```

Backend dev server:

```bash
cd backend
..\venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Frontend build:

```bash
cd fastapi-frontend
npm run build
```

Frontend dev server:

```bash
cd fastapi-frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

## Adding New Features

- For a new backend API:
  - add route logic in `backend/app/routes/`
  - add business logic in `backend/app/services/`
  - add request/response schemas in `backend/app/schemas/`
- For a database change:
  - update models in `backend/app/models/`
  - create or update Alembic migration files
- For a new frontend screen:
  - add a file in `fastapi-frontend/src/pages/`
- For reusable frontend UI:
  - add components in `fastapi-frontend/src/components/`
- For shared frontend helpers:
  - use `fastapi-frontend/src/lib/` or `fastapi-frontend/src/context/`

## Project Rules

- Keep route files focused on request and response handling.
- Keep service files focused on business logic.
- Keep models for database structure only.
- Keep pages for full screens and components for reusable UI.
- Run backend tests and frontend build after major changes.
