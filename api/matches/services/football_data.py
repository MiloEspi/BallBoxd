import asyncio
import logging
import time
from datetime import datetime, timezone as datetime_timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import httpx
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TIER_ONE_CODES = {"PL", "PD", "BL1", "SA", "FL1", "CL", "EL", "EC", "WC"}


class FootballDataError(Exception):
    def __init__(
        self,
        message,
        status_code=None,
        endpoint=None,
        error_type=None,
        retryable=False,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.endpoint = endpoint
        self.error_type = error_type
        self.retryable = bool(retryable)


class FootballDataClient:
    def __init__(
        self,
        token=None,
        base_url=None,
        timeout=None,
        cache_seconds=None,
        rate_limiter=None,
        max_attempts=None,
    ):
        self.token = (token or settings.FOOTBALL_DATA_TOKEN or "").strip()
        if not self.token:
            raise FootballDataError(
                "FOOTBALL_DATA_TOKEN is not configured.",
                error_type="config",
                retryable=False,
            )
        self.base_url = (base_url or settings.FOOTBALL_DATA_BASE_URL).rstrip("/")
        total_timeout = (
            float(timeout)
            if timeout is not None
            else float(getattr(settings, "FOOTBALL_DATA_TIMEOUT_SECONDS", 20))
        )
        self.timeout = httpx.Timeout(
            connect=float(
                getattr(settings, "FOOTBALL_DATA_CONNECT_TIMEOUT_SECONDS", 5)
            ),
            read=float(
                getattr(settings, "FOOTBALL_DATA_READ_TIMEOUT_SECONDS", total_timeout)
            ),
            write=float(
                getattr(settings, "FOOTBALL_DATA_WRITE_TIMEOUT_SECONDS", total_timeout)
            ),
            pool=float(
                getattr(settings, "FOOTBALL_DATA_POOL_TIMEOUT_SECONDS", total_timeout)
            ),
        )
        self.cache_seconds = (
            int(cache_seconds)
            if cache_seconds is not None
            else int(getattr(settings, "FOOTBALL_DATA_CACHE_SECONDS", 0))
        )
        if rate_limiter is None:
            rate_limit = int(getattr(settings, "FOOTBALL_DATA_RATE_LIMIT_PER_MINUTE", 0))
            window_seconds = int(
                getattr(settings, "FOOTBALL_DATA_RATE_LIMIT_WINDOW_SECONDS", 60)
            )
            if rate_limit > 0 and window_seconds > 0:
                from .rate_limit import AsyncRateLimiter

                rate_limiter = AsyncRateLimiter(rate_limit, window_seconds)
        self.rate_limiter = rate_limiter
        self.api_calls_used = 0
        self.max_attempts = (
            int(max_attempts)
            if max_attempts is not None
            else int(getattr(settings, "FOOTBALL_DATA_HTTP_MAX_ATTEMPTS", 3))
        )
        self.retry_after_fallback_seconds = int(
            getattr(settings, "FOOTBALL_DATA_RETRY_AFTER_FALLBACK_SECONDS", 60)
        )
        self.throttle_seconds = float(
            getattr(settings, "FOOTBALL_DATA_THROTTLE_SECONDS", 1)
        )
        self._request_lock = asyncio.Lock()
        self._last_request_at = 0.0

    async def get_competitions_tier_one(self):
        payload = await self.request("/competitions", params={"plan": "TIER_ONE"})
        competitions = payload.get("competitions", [])
        if not competitions:
            return payload
        filtered = [
            item for item in competitions if item.get("code") in TIER_ONE_CODES
        ]
        if filtered:
            payload["competitions"] = filtered
        return payload

    async def get_matches_global(self, date_from, date_to):
        return await self.request(
            "/matches",
            params={"dateFrom": date_from, "dateTo": date_to},
        )

    async def get_competition_matches(self, competition_id, date_from=None, date_to=None):
        params = {}
        if date_from:
            params["dateFrom"] = date_from
        if date_to:
            params["dateTo"] = date_to
        return await self.request(f"/competitions/{competition_id}/matches", params=params)

    async def get_competition_teams(self, competition_id):
        return await self.request(f"/competitions/{competition_id}/teams")

    async def request(self, path, params=None):
        url = f"{self.base_url}{path}"
        headers = {"X-Auth-Token": self.token}
        cache_key = self._build_cache_key(path, params)
        if self.cache_seconds > 0:
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

        attempts = max(1, int(self.max_attempts))
        for attempt in range(attempts):
            attempt_number = attempt + 1
            try:
                if self.rate_limiter:
                    await self.rate_limiter.wait()
                await self._throttle()
                self.api_calls_used += 1
                logger.info(
                    "calling football-data: %s params=%s attempt=%s/%s",
                    url,
                    params or {},
                    attempt_number,
                    attempts,
                )
                response = await self._fetch(url, params=params, headers=headers)
            except httpx.TimeoutException as exc:
                logger.warning(
                    "Football-data timeout attempt=%s/%s endpoint=%s error=%s",
                    attempt_number,
                    attempts,
                    path,
                    exc,
                )
                if attempt < attempts - 1:
                    await asyncio.sleep(self._retry_delay_seconds(attempt))
                    continue
                raise FootballDataError(
                    "football-data request timed out.",
                    endpoint=path,
                    error_type="timeout",
                    retryable=True,
                ) from exc
            except httpx.RequestError as exc:
                logger.warning(
                    "Football-data request error attempt=%s/%s endpoint=%s error=%s",
                    attempt_number,
                    attempts,
                    path,
                    exc,
                )
                if attempt < attempts - 1:
                    await asyncio.sleep(self._retry_delay_seconds(attempt))
                    continue
                raise FootballDataError(
                    f"Network error calling football-data.org: {exc}",
                    endpoint=path,
                    error_type="network",
                    retryable=True,
                ) from exc

            available = _parse_int(response.headers.get("X-Requests-Available-Minute"))
            reset_seconds = _parse_int(response.headers.get("X-RequestCounter-Reset"))
            logger.info("response status: %s endpoint=%s", response.status_code, path)
            logger.info(
                "football-data request endpoint=%s status=%s remaining=%s reset=%s",
                path,
                response.status_code,
                available,
                reset_seconds,
            )

            if available is not None and available <= 2:
                logger.warning(
                    "football-data rate limit low: remaining=%s reset=%s",
                    available,
                    reset_seconds,
                )

            if response.status_code == 429:
                wait_seconds = _parse_retry_after(response.headers.get("Retry-After"))
                if wait_seconds is None:
                    wait_seconds = self.retry_after_fallback_seconds
                logger.warning(
                    "football-data rate limited endpoint=%s retry_in=%ss attempt=%s/%s",
                    path,
                    wait_seconds,
                    attempt_number,
                    attempts,
                )
                if attempt < attempts - 1:
                    await asyncio.sleep(wait_seconds)
                    continue
                raise FootballDataError(
                    "football-data rate limit exceeded (429).",
                    status_code=response.status_code,
                    endpoint=path,
                    error_type="rate_limited",
                    retryable=True,
                )

            if response.status_code == 401:
                raise FootballDataError(
                    "football-data unauthorized (401). Check FOOTBALL_DATA_TOKEN.",
                    status_code=response.status_code,
                    endpoint=path,
                    error_type="auth",
                    retryable=False,
                )

            if response.status_code == 403:
                logger.error(
                    "football-data request forbidden endpoint=%s status=%s",
                    path,
                    response.status_code,
                )
                raise FootballDataError(
                    "football-data request forbidden (403). Check plan/permissions.",
                    status_code=response.status_code,
                    endpoint=path,
                    error_type="forbidden",
                    retryable=False,
                )

            if response.status_code >= 500:
                wait_seconds = self._retry_delay_seconds(attempt)
                logger.warning(
                    "football-data upstream error endpoint=%s status=%s retry_in=%ss attempt=%s/%s",
                    path,
                    response.status_code,
                    wait_seconds,
                    attempt_number,
                    attempts,
                )
                if attempt < attempts - 1:
                    await asyncio.sleep(wait_seconds)
                    continue
                raise FootballDataError(
                    f"football-data upstream failed with status {response.status_code}.",
                    status_code=response.status_code,
                    endpoint=path,
                    error_type="upstream",
                    retryable=True,
                )

            if response.status_code >= 400:
                raise FootballDataError(
                    f"football-data request failed with status {response.status_code}.",
                    status_code=response.status_code,
                    endpoint=path,
                    error_type="client_error",
                    retryable=False,
                )

            try:
                payload = response.json()
            except ValueError as exc:
                raise FootballDataError(
                    "Invalid JSON response from football-data.org.",
                    endpoint=path,
                    error_type="invalid_json",
                    retryable=True,
                ) from exc

            if _has_api_error(payload):
                message = payload.get("error") or payload.get("message")
                raise FootballDataError(
                    f"football-data error response: {message}",
                    endpoint=path,
                    error_type="api_error",
                    retryable=False,
                )

            if available == 0 and reset_seconds and reset_seconds > 0:
                wait_seconds = reset_seconds
                await asyncio.sleep(wait_seconds)

            if self.cache_seconds > 0:
                cache.set(cache_key, payload, timeout=self.cache_seconds)

            return payload

        raise FootballDataError(
            "football-data request failed after retries.",
            endpoint=path,
            error_type="unknown",
            retryable=True,
        )

    async def _fetch(self, url, params=None, headers=None):
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            return await client.get(url, params=params, headers=headers)

    async def _throttle(self):
        if self.throttle_seconds <= 0:
            return
        async with self._request_lock:
            now = time.monotonic()
            wait_seconds = self.throttle_seconds - (now - self._last_request_at)
            if wait_seconds > 0:
                await asyncio.sleep(wait_seconds)
            self._last_request_at = time.monotonic()

    def _retry_delay_seconds(self, attempt: int) -> int:
        return max(1, min(30, 2**attempt))

    def _build_cache_key(self, path, params):
        if not params:
            return f"football_data:{self.base_url}:{path}"
        parts = [f"{key}={params[key]}" for key in sorted(params)]
        query = "&".join(parts)
        return f"football_data:{self.base_url}:{path}?{query}"


def _parse_int(value: Optional[str]) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse_retry_after(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    try:
        return max(int(float(value)), 0)
    except (TypeError, ValueError):
        pass

    try:
        parsed = parsedate_to_datetime(value)
        if parsed is None:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=datetime_timezone.utc)
        seconds = (parsed - datetime.now(datetime_timezone.utc)).total_seconds()
        return max(int(seconds), 0)
    except (TypeError, ValueError, OverflowError):
        return None


def _has_api_error(payload: object) -> bool:
    if not isinstance(payload, dict):
        return False
    if payload.get("error"):
        return True
    message = payload.get("message")
    if not message:
        return False
    expected_payload_keys = {"matches", "competitions", "teams", "count", "resultSet"}
    if expected_payload_keys.intersection(payload.keys()):
        return False
    return True
