import asyncio
import logging
from typing import Optional

import httpx
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TIER_ONE_CODES = {"PL", "PD", "BL1", "SA", "FL1", "CL", "EL", "EC", "WC"}


class FootballDataError(Exception):
    def __init__(self, message, status_code=None, endpoint=None):
        super().__init__(message)
        self.status_code = status_code
        self.endpoint = endpoint


class FootballDataClient:
    def __init__(self, token=None, base_url=None, timeout=10, cache_seconds=None, rate_limiter=None):
        self.token = (token or settings.FOOTBALL_DATA_TOKEN or "").strip()
        if not self.token:
            raise FootballDataError("FOOTBALL_DATA_TOKEN is not configured.")
        self.base_url = (base_url or settings.FOOTBALL_DATA_BASE_URL).rstrip("/")
        self.timeout = timeout
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

    async def request(self, path, params=None):
        url = f"{self.base_url}{path}"
        headers = {"X-Auth-Token": self.token}
        last_error = None
        cache_key = self._build_cache_key(path, params)
        if self.cache_seconds > 0:
            cached = cache.get(cache_key)
            if cached is not None:
                return cached

        for attempt in range(2):
            try:
                if self.rate_limiter:
                    await self.rate_limiter.wait()
                self.api_calls_used += 1
                response = await self._fetch(url, params=params, headers=headers)
            except httpx.RequestError as exc:
                logger.warning("Football-data request error: %s", exc)
                last_error = exc
                if attempt == 0:
                    await asyncio.sleep(1)
                    continue
                raise FootballDataError("Network error calling football-data.org.") from exc

            available = _parse_int(response.headers.get("X-Requests-Available-Minute"))
            reset_seconds = _parse_int(response.headers.get("X-RequestCounter-Reset"))
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
                wait_seconds = reset_seconds if reset_seconds else 10
                logger.warning("football-data rate limited, retry in %ss", wait_seconds)
                if attempt == 0:
                    await asyncio.sleep(wait_seconds)
                    continue
                raise FootballDataError(
                    "football-data rate limit exceeded.",
                    status_code=response.status_code,
                    endpoint=path,
                )

            if response.status_code in {403, 404}:
                logger.error(
                    "football-data request denied endpoint=%s status=%s",
                    path,
                    response.status_code,
                )
                raise FootballDataError(
                    "football-data request denied.",
                    status_code=response.status_code,
                    endpoint=path,
                )

            if response.status_code >= 400:
                raise FootballDataError(
                    f"football-data request failed with status {response.status_code}.",
                    status_code=response.status_code,
                    endpoint=path,
                )

            try:
                payload = response.json()
            except ValueError as exc:
                raise FootballDataError("Invalid JSON response from football-data.org.") from exc

            if payload.get("error") or payload.get("message"):
                message = payload.get("error") or payload.get("message")
                raise FootballDataError(
                    f"football-data error response: {message}",
                    endpoint=path,
                )

            if available == 0:
                wait_seconds = reset_seconds if reset_seconds else 10
                await asyncio.sleep(wait_seconds)

            if self.cache_seconds > 0:
                cache.set(cache_key, payload, timeout=self.cache_seconds)

            return payload

        raise FootballDataError("football-data request failed.", endpoint=path) from last_error

    async def _fetch(self, url, params=None, headers=None):
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            return await client.get(url, params=params, headers=headers)

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
