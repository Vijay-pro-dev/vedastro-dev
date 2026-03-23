import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings

try:
    import redis
    from redis.exceptions import RedisError
except Exception:
    redis = None
    RedisError = Exception


SECURITY_LOGGER = logging.getLogger("vedastro.security")
REQUEST_LOGGER = logging.getLogger("vedastro.requests")


def _client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@dataclass
class RateLimitRule:
    max_requests: int
    window_seconds: int


class InMemoryRateLimiter:
    """A lightweight in-memory limiter suitable for local/demo deployments."""

    def __init__(self):
        self._buckets: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, rule: RateLimitRule) -> tuple[bool, int]:
        now = time.time()
        bucket = self._buckets[key]
        cutoff = now - rule.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= rule.max_requests:
            retry_after = max(1, int(rule.window_seconds - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
        return True, 0


class RedisRateLimiter:
    """Redis-backed limiter for multi-instance deployments."""

    def __init__(self, redis_url: str):
        self.client = None
        if redis:
            try:
                client = redis.from_url(redis_url, decode_responses=True)
                client.ping()
                self.client = client
            except Exception as exc:
                SECURITY_LOGGER.warning("redis_rate_limiter_fallback reason=%s", exc)

    def allow(self, key: str, rule: RateLimitRule) -> tuple[bool, int]:
        if not self.client:
            return True, 0
        try:
            current = self.client.incr(key)
            if current == 1:
                self.client.expire(key, rule.window_seconds)
            if current > rule.max_requests:
                retry_after = self.client.ttl(key)
                return False, max(1, int(retry_after or rule.window_seconds))
            return True, 0
        except RedisError as exc:
            SECURITY_LOGGER.warning("redis_rate_limiter_disabled reason=%s", exc)
            self.client = None
            return True, 0


class SecurityMiddleware(BaseHTTPMiddleware):
    """Applies basic WAF heuristics, request logging, and IP-based rate limits."""

    BLOCKED_PATTERNS = (
        "<script",
        "union select",
        "../",
        " or 1=1",
        "drop table",
        "xp_cmdshell",
    )
    BLOCKED_USER_AGENTS = ("sqlmap", "nikto", "nmap", "acunetix")

    def __init__(self, app):
        super().__init__(app)
        settings = get_settings()
        self.general_rule = RateLimitRule(max_requests=settings.general_rate_limit_per_minute, window_seconds=60)
        self.auth_rule = RateLimitRule(max_requests=settings.auth_rate_limit_per_minute, window_seconds=60)
        self.rate_limiter = (
            RedisRateLimiter(settings.redis_url)
            if settings.use_redis_rate_limit and redis
            else InMemoryRateLimiter()
        )

    async def dispatch(self, request: Request, call_next):
        ip_address = _client_ip(request)
        path = request.url.path.lower()
        query_string = request.url.query.lower()
        user_agent = request.headers.get("user-agent", "").lower()

        # Let CORS preflight pass through without WAF/rate limits.
        if request.method.upper() == "OPTIONS":
            return await call_next(request)

        if any(pattern in path or pattern in query_string for pattern in self.BLOCKED_PATTERNS) or any(
            agent in user_agent for agent in self.BLOCKED_USER_AGENTS
        ):
            SECURITY_LOGGER.warning("waf_block ip=%s path=%s query=%s agent=%s", ip_address, path, query_string, user_agent)
            return JSONResponse(status_code=403, content={"detail": "Request blocked by security policy"})

        rule = self.auth_rule if path in {"/login", "/signup", "/admin-login"} else self.general_rule
        allowed, retry_after = self.rate_limiter.allow(f"{ip_address}:{path}", rule)
        if not allowed:
            SECURITY_LOGGER.warning("rate_limit ip=%s path=%s retry_after=%s", ip_address, path, retry_after)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again shortly."},
                headers={"Retry-After": str(retry_after)},
            )

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start) * 1000, 2)
        REQUEST_LOGGER.info(
            "request method=%s path=%s status=%s ip=%s duration_ms=%s",
            request.method,
            request.url.path,
            response.status_code,
            ip_address,
            duration_ms,
        )
        return response
