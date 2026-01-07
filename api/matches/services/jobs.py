import logging
import time
from dataclasses import dataclass
from datetime import date, timedelta

from django.core.cache import cache
from django.utils import timezone

from matches.services.football_data import FootballDataClient
from matches.services.importers import (
    get_default_date_range,
    get_import_frequency_minutes,
    import_matches_global_batched,
)
from matches.services.polling import poll_finished_matches

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ImportFixturesResult:
    competitions: int
    teams: int
    matches: int
    created_matches: int
    updated_matches: int
    skipped_matches: int
    api_calls_used: int
    duration_seconds: float


@dataclass(frozen=True)
class PollMatchesResult:
    skipped: bool
    reason: str
    last_run_seconds_ago: int | None
    updated_matches: int
    created_matches: int
    skipped_matches: int
    matches_seen: int
    competitions: int
    teams: int
    api_calls_used: int
    duration_seconds: float


def import_fixtures_once(
    *,
    leagues: list[int] | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    days_ahead: int | None = None,
    days_back: int | None = None,
) -> ImportFixturesResult:
    start = time.monotonic()
    now = timezone.now()
    if date_from is None or date_to is None:
        if days_ahead is not None or days_back is not None:
            ahead = max(0, int(days_ahead or 0))
            back = max(0, int(days_back or 0))
            today = now.date()
            date_from = today - timedelta(days=back)
            date_to = today + timedelta(days=ahead)
        else:
            date_from, date_to = get_default_date_range(now)

    client = FootballDataClient()
    summary = import_matches_global_batched(
        date_from,
        date_to,
        competition_ids=leagues,
        client=client,
        raise_on_error=True,
    )
    duration = time.monotonic() - start
    return ImportFixturesResult(
        competitions=summary.competitions,
        teams=summary.teams,
        matches=summary.matches,
        created_matches=summary.created_matches,
        updated_matches=summary.updated_matches,
        skipped_matches=summary.skipped_matches,
        api_calls_used=getattr(client, "api_calls_used", 0),
        duration_seconds=duration,
    )


def poll_matches_once(
    *,
    interval_minutes: int | None = None,
    cache_key: str = "matches:poll:last_run",
    use_cache: bool = True,
    now=None,
) -> PollMatchesResult:
    start = time.monotonic()
    now = now or timezone.now()
    interval_minutes = int(interval_minutes or get_import_frequency_minutes(now))

    if use_cache:
        last_run = cache.get(cache_key)
        if last_run and interval_minutes > 0:
            elapsed_seconds = int((now - last_run).total_seconds())
            if elapsed_seconds < interval_minutes * 60:
                duration = time.monotonic() - start
                return PollMatchesResult(
                    skipped=True,
                    reason=f"last run {elapsed_seconds}s ago (< {interval_minutes}m)",
                    last_run_seconds_ago=elapsed_seconds,
                    updated_matches=0,
                    created_matches=0,
                    skipped_matches=0,
                    matches_seen=0,
                    competitions=0,
                    teams=0,
                    api_calls_used=0,
                    duration_seconds=duration,
                )

    client = FootballDataClient()

    summary = poll_finished_matches(now=now, client=client, raise_on_error=True)
    if use_cache and interval_minutes > 0:
        cache.set(cache_key, now, timeout=interval_minutes * 60)

    duration = time.monotonic() - start
    return PollMatchesResult(
        skipped=False,
        reason="ran",
        last_run_seconds_ago=None,
        updated_matches=summary.updated_matches,
        created_matches=summary.created_matches,
        skipped_matches=summary.skipped_matches,
        matches_seen=summary.matches,
        competitions=summary.competitions,
        teams=summary.teams,
        api_calls_used=getattr(client, "api_calls_used", 0),
        duration_seconds=duration,
    )
