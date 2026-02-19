import time
from dataclasses import dataclass
from datetime import date, timedelta

from django.utils import timezone

from matches.models import Tournament
from matches.services.football_data import FootballDataClient, TIER_ONE_CODES
from matches.services.importers import (
    import_competitions_tier_one,
    import_teams_for_competitions,
)
from matches.services.jobs import import_fixtures_once


@dataclass(frozen=True)
class BootstrapResult:
    competitions: int
    teams: int
    fixtures_matches: int
    fixtures_created: int
    fixtures_updated: int
    fixtures_skipped: int
    fixtures_date_from: date | None
    fixtures_date_to: date | None
    api_calls_used: int
    duration_seconds: float


def bootstrap_once(
    *,
    leagues: list[int] | None = None,
    codes: list[str] | None = None,
    fixtures_days: int | None = None,
    fixtures_days_back: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
) -> BootstrapResult:
    start = time.monotonic()
    client = FootballDataClient()

    normalized_codes = _normalize_codes(codes)
    import_competitions_tier_one(
        competition_ids=leagues,
        codes=normalized_codes,
        client=client,
        raise_on_error=True,
    )

    competition_ids = _load_competition_ids(leagues=leagues, codes=normalized_codes)
    teams_summary = import_teams_for_competitions(
        competition_ids=competition_ids,
        client=client,
        raise_on_error=True,
    )

    used_date_from = None
    used_date_to = None
    fixtures_matches = 0
    fixtures_created = 0
    fixtures_updated = 0
    fixtures_skipped = 0

    if (
        fixtures_days is not None
        or fixtures_days_back is not None
        or date_from is not None
        or date_to is not None
    ):
        used_date_from, used_date_to = _resolve_fixture_range(
            fixtures_days=fixtures_days,
            fixtures_days_back=fixtures_days_back,
            date_from=date_from,
            date_to=date_to,
        )
        fixtures = import_fixtures_once(
            leagues=competition_ids or leagues,
            date_from=used_date_from,
            date_to=used_date_to,
            client=client,
        )
        fixtures_matches = fixtures.matches
        fixtures_created = fixtures.created_matches
        fixtures_updated = fixtures.updated_matches
        fixtures_skipped = fixtures.skipped_matches

    duration = time.monotonic() - start
    return BootstrapResult(
        competitions=len(competition_ids),
        teams=teams_summary.teams,
        fixtures_matches=fixtures_matches,
        fixtures_created=fixtures_created,
        fixtures_updated=fixtures_updated,
        fixtures_skipped=fixtures_skipped,
        fixtures_date_from=used_date_from,
        fixtures_date_to=used_date_to,
        api_calls_used=getattr(client, "api_calls_used", 0),
        duration_seconds=duration,
    )


def _normalize_codes(codes: list[str] | None) -> list[str] | None:
    if not codes:
        return None
    normalized = []
    for code in codes:
        value = (code or "").strip().upper()
        if value and value not in normalized:
            normalized.append(value)
    return normalized or None


def _load_competition_ids(
    *,
    leagues: list[int] | None,
    codes: list[str] | None,
) -> list[int]:
    qs = Tournament.objects.exclude(external_id__isnull=True)
    if leagues:
        qs = qs.filter(external_id__in=leagues)
    elif codes:
        qs = qs.filter(code__in=codes)
    else:
        qs = qs.filter(code__in=TIER_ONE_CODES)
    return list(qs.values_list("external_id", flat=True).distinct())


def _resolve_fixture_range(
    *,
    fixtures_days: int | None,
    fixtures_days_back: int | None,
    date_from: date | None,
    date_to: date | None,
) -> tuple[date, date]:
    if date_from is not None or date_to is not None:
        now = timezone.now().date()
        start = date_from or now
        end = date_to or now
        if start > end:
            start, end = end, start
        return start, end

    ahead = max(0, int(fixtures_days or 0))
    back = max(0, int(fixtures_days_back or 0))
    today = timezone.now().date()
    return today - timedelta(days=back), today + timedelta(days=ahead)
