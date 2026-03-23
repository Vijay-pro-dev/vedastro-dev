import importlib
import shutil
import tempfile
from uuid import uuid4
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch):
    runtime_root = Path(tempfile.gettempdir()) / "vedastro-tests"
    runtime_root.mkdir(parents=True, exist_ok=True)
    run_id = uuid4().hex
    db_path = runtime_root / f"test-{run_id}.db"
    uploads_dir = runtime_root / f"uploads-{run_id}"
    logs_dir = runtime_root / f"logs-{run_id}"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    logs_dir.mkdir(parents=True, exist_ok=True)

    monkeypatch.setenv("APP_ENV", "test")
    monkeypatch.setenv("DEBUG", "false")
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("UPLOADS_DIR", uploads_dir.as_posix())
    monkeypatch.setenv("USE_REDIS_RATE_LIMIT", "false")
    monkeypatch.setenv("SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("DEFAULT_ADMIN_EMAIL", "admin@gmail.com")
    monkeypatch.setenv("DEFAULT_ADMIN_PASSWORD", "admin123")
    monkeypatch.setenv("CORS_ALLOW_ORIGINS", '["http://localhost:5173"]')
    monkeypatch.setenv("REQUEST_LOG_FILE", (logs_dir / "backend.log").as_posix())
    monkeypatch.setenv("SECURITY_LOG_FILE", (logs_dir / "backend.err.log").as_posix())

    import app.core.config as config_module
    import app.core.database as database_module
    import app.models.user as user_models_module
    import app.core.security as security_module
    import app.core.security_middleware as security_middleware_module
    import app.services.admin_service as admin_service_module
    import app.services.activity_service as activity_service_module
    import app.services.profile_service as profile_service_module
    import app.routes.auth as auth_module
    import app.routes.admin as admin_route_module
    import app.routes.profile as profile_route_module
    import app.routes.dashboard as dashboard_route_module
    import app.main as main_module

    config_module.get_settings.cache_clear()
    config_module = importlib.reload(config_module)
    database_module = importlib.reload(database_module)
    user_models_module = importlib.reload(user_models_module)
    security_module = importlib.reload(security_module)
    security_middleware_module = importlib.reload(security_middleware_module)
    admin_service_module = importlib.reload(admin_service_module)
    activity_service_module = importlib.reload(activity_service_module)
    profile_service_module = importlib.reload(profile_service_module)
    auth_module = importlib.reload(auth_module)
    admin_route_module = importlib.reload(admin_route_module)
    profile_route_module = importlib.reload(profile_route_module)
    dashboard_route_module = importlib.reload(dashboard_route_module)
    main_module = importlib.reload(main_module)

    app = main_module.create_app()
    with TestClient(app) as test_client:
        yield test_client

    database_module.engine.dispose()
    shutil.rmtree(uploads_dir, ignore_errors=True)
    shutil.rmtree(logs_dir, ignore_errors=True)
    try:
        db_path.unlink(missing_ok=True)
    except PermissionError:
        pass
