# Vedastro Frontend

React + Vite frontend for the Vedastro SaaS dashboard.

## Structure

- `src/pages`
  - route-level screens such as landing, login, signup, dashboard, profile, and admin
- `src/components/dashboard`
  - dashboard-only reusable UI blocks
- `src/components/profile`
  - profile flow helpers such as birth time questionnaire
- `src/components/shared`
  - route guards and shared helpers used across screens
- `src/context`
  - global user session and translation-aware app state
- `src/lib`
  - API client and i18n helpers
- `src/assets`
  - static frontend assets

## Common Commands

Install dependencies:

```bash
npm install
```

Run dev server:

```bash
npm run dev
```

Create production build:

```bash
npm run build
```
