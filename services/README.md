# Services

This folder contains the future microservices split for Vedastro.

Current status:
- `auth` wraps the existing auth routes.
- `health` provides standalone readiness and health checks.
- `career` wraps the current dashboard/career routes.
- `admin` wraps the admin routes.
- `relationship` and `finance` are scaffolded for future expansion.

The current app still works as-is, so this structure can be adopted gradually.
