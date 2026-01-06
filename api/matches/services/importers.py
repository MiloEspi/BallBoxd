import logging
from dataclasses import dataclass
from datetime import date, timedelta

from asgiref.sync import async_to_sync

import asyncio
from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from matches.models import Match, Team, Tournament

from .football_data import FootballDataClient, FootballDataError

logger = logging.getLogger(__name__)

FINISHED_STATUSES = {"FINISHED", "AWARDED", "FT", "AET", "PEN"}


@dataclass(frozen=True)
class ImportSummary:
    competitions: int = 0
    teams: int = 0
    matches: int = 0


def get_import_range_days():
    return int(getattr(settings, "IMPORT_MATCHES_RANGE_DAYS", 0))


def get_default_date_range(now=None):
    now = now or timezone.now()
    range_days = get_import_range_days()
    start = now.date() - timedelta(days=range_days)
    end = now.date() + timedelta(days=range_days)
    return start, end


def get_import_frequency_minutes(now=None):
    now = now or timezone.now()
    weekday_default = int(getattr(settings, "IMPORT_MATCHES_WEEKDAY_MINUTES", 180))
    weekend_default = int(getattr(settings, "IMPORT_MATCHES_WEEKEND_MINUTES", 60))
    fallback = int(getattr(settings, "IMPORT_MATCHES_FREQUENCY_MINUTES", 60))
    if weekday_default <= 0 or weekend_default <= 0:
        return fallback
    return weekend_default if now.weekday() >= 5 else weekday_default


def import_competitions_tier_one(competition_ids=None, codes=None, client=None):
    try:
        client = client or FootballDataClient()
        payload = _run_async(client.get_competitions_tier_one())
    except FootballDataError as exc:
        logger.error("Competition import failed: %s", exc)
        return ImportSummary()

    items = payload.get("competitions", [])
    if competition_ids:
        ids_set = set(int(item) for item in competition_ids)
        items = [item for item in items if item.get("id") in ids_set]
    if codes:
        codes_set = {code.upper() for code in codes}
        items = [item for item in items if (item.get("code") or "").upper() in codes_set]

    competitions = set()
    for item in items:
        tournament = upsert_competition_from_api(item)
        if tournament:
            competitions.add(tournament.external_id)
    return ImportSummary(competitions=len(competitions))


def import_matches_global(date_from, date_to, competition_ids=None, client=None):
    date_from_str = _format_date(date_from)
    date_to_str = _format_date(date_to)
    try:
        client = client or FootballDataClient()
        payload = _run_async(client.get_matches_global(date_from_str, date_to_str))
    except FootballDataError as exc:
        logger.error("Global match import failed: %s", exc)
        return ImportSummary()

    matches = payload.get("matches", [])
    if competition_ids:
        ids_set = set(int(item) for item in competition_ids)
        matches = [
            item
            for item in matches
            if item.get("competition", {}).get("id") in ids_set
        ]

    competition_cache = {}
    team_cache = {}
    competitions = set()
    teams = set()
    matches_seen = set()

    for item in matches:
        competition = _get_or_cache_competition(
            item.get("competition", {}),
            competition_cache,
        )
        if not competition:
            continue
        competitions.add(competition.external_id)

        home_team = _get_or_cache_team(item.get("homeTeam", {}), team_cache)
        away_team = _get_or_cache_team(item.get("awayTeam", {}), team_cache)
        if not home_team or not away_team:
            continue
        teams.add(home_team.external_id)
        teams.add(away_team.external_id)

        match = upsert_match_from_api(item, competition, home_team, away_team)
        if match:
            matches_seen.add(match.external_id)

    return ImportSummary(
        competitions=len(competitions),
        teams=len(teams),
        matches=len(matches_seen),
    )


def upsert_competition_from_api(competition):
    external_id = competition.get("id")
    if not external_id:
        return None
    name = competition.get("name") or ""
    code = competition.get("code") or ""
    emblem = competition.get("emblem") or ""
    area = competition.get("area") or {}
    country = area.get("name") or ""
    tournament = Tournament.objects.filter(external_id=external_id).first()
    if not tournament:
        tournament = Tournament.objects.filter(name=name, country=country).first()
    if tournament:
        tournament.external_id = external_id
        tournament.name = name
        tournament.country = country
        tournament.code = code
        tournament.logo_url = emblem
        tournament.save(update_fields=["external_id", "name", "country", "code", "logo_url"])
        return tournament
    tournament = Tournament.objects.create(
        external_id=external_id,
        name=name,
        country=country,
        code=code,
        logo_url=emblem,
    )
    return tournament


def upsert_team_from_api(team_data):
    external_id = team_data.get("id")
    if not external_id:
        return None
    name = (
        team_data.get("name")
        or team_data.get("shortName")
        or team_data.get("tla")
        or ""
    )
    crest = team_data.get("crest") or team_data.get("crestUrl") or ""
    area = team_data.get("area") or {}
    country = area.get("name") or ""
    team, _ = Team.objects.update_or_create(
        external_id=external_id,
        defaults={
            "name": name,
            "country": country,
            "logo_url": crest,
        },
    )
    return team


def upsert_match_from_api(match_data, competition, home_team, away_team):
    external_id = match_data.get("id")
    if not external_id:
        return None
    date_time = _parse_datetime(match_data.get("utcDate"))
    if not date_time:
        return None
    status = match_data.get("status") or ""
    venue = match_data.get("venue") or ""
    home_score, away_score = _extract_score(match_data.get("score") or {})

    match, _ = Match.objects.update_or_create(
        external_id=external_id,
        defaults={
            "tournament": competition,
            "home_team": home_team,
            "away_team": away_team,
            "date_time": date_time,
            "venue": venue,
            "status": status,
            "home_score": home_score,
            "away_score": away_score,
        },
    )
    return match


def _get_or_cache_competition(data, cache):
    external_id = data.get("id")
    if not external_id:
        return None
    if external_id in cache:
        return cache[external_id]
    tournament = upsert_competition_from_api(data)
    if tournament:
        cache[external_id] = tournament
    return tournament


def _get_or_cache_team(data, cache):
    external_id = data.get("id")
    if not external_id:
        return None
    if external_id in cache:
        return cache[external_id]
    team = upsert_team_from_api(data)
    if team:
        cache[external_id] = team
    return team


def _extract_score(score):
    full_time = score.get("fullTime") or {}
    regular_time = score.get("regularTime") or {}
    home = full_time.get("home")
    away = full_time.get("away")
    if home is None:
        home = regular_time.get("home")
    if away is None:
        away = regular_time.get("away")
    return _safe_score(home), _safe_score(away)


def _safe_score(value):
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _format_date(value):
    if isinstance(value, date):
        return value.isoformat()
    return value


async def _await_coro(coro):
    return await coro


def _run_async(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)
    return async_to_sync(_await_coro)(coro)


def _parse_datetime(value):
    if not value:
        return None
    parsed = parse_datetime(value)
    if not parsed:
        return None
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone=timezone.utc)
    return parsed
