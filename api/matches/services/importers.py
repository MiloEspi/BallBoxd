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
    created_matches: int = 0
    updated_matches: int = 0
    skipped_matches: int = 0


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


def import_competitions_tier_one(competition_ids=None, codes=None, client=None, *, raise_on_error: bool = False):
    try:
        client = client or FootballDataClient()
        payload = _run_async(client.get_competitions_tier_one())
    except FootballDataError as exc:
        logger.error("Competition import failed: %s", exc)
        if raise_on_error:
            raise
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
        tournament, _, _ = upsert_competition_from_api(item)
        if tournament:
            competitions.add(tournament.external_id)
    return ImportSummary(competitions=len(competitions))


def import_teams_for_competitions(
    competition_ids,
    client=None,
    *,
    raise_on_error: bool = False,
):
    unique_ids: list[int] = []
    for value in competition_ids or []:
        try:
            item = int(value)
        except (TypeError, ValueError):
            continue
        if item not in unique_ids:
            unique_ids.append(item)

    if not unique_ids:
        return ImportSummary()

    try:
        client = client or FootballDataClient()
    except FootballDataError as exc:
        logger.error("Competition team import failed: %s", exc)
        if raise_on_error:
            raise
        return ImportSummary()

    competitions = set()
    teams = set()
    for competition_id in unique_ids:
        try:
            payload = _run_async(client.get_competition_teams(competition_id))
        except FootballDataError as exc:
            logger.error(
                "Competition team import failed competition=%s: %s",
                competition_id,
                exc,
            )
            if raise_on_error:
                raise
            continue

        competition_payload = payload.get("competition") or {"id": competition_id}
        tournament, _, _ = upsert_competition_from_api(competition_payload)
        if tournament and tournament.external_id is not None:
            competitions.add(tournament.external_id)
        else:
            competitions.add(competition_id)

        for team_data in payload.get("teams", []):
            team, _, _ = upsert_team_from_api(team_data)
            if team and team.external_id is not None:
                teams.add(team.external_id)

    return ImportSummary(
        competitions=len(competitions),
        teams=len(teams),
    )


def import_matches_global(date_from, date_to, competition_ids=None, client=None, *, raise_on_error: bool = False):
    date_from_str = _format_date(date_from)
    date_to_str = _format_date(date_to)
    try:
        client = client or FootballDataClient()
        payload = _run_async(client.get_matches_global(date_from_str, date_to_str))
    except FootballDataError as exc:
        logger.error("Global match import failed: %s", exc)
        if raise_on_error:
            raise
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
    created_matches = 0
    updated_matches = 0
    skipped_matches = 0

    for item in matches:
        competition, _, _ = _get_or_cache_competition(
            item.get("competition", {}),
            competition_cache,
        )
        if not competition:
            continue
        competitions.add(competition.external_id)

        home_team, _, _ = _get_or_cache_team(item.get("homeTeam", {}), team_cache)
        away_team, _, _ = _get_or_cache_team(item.get("awayTeam", {}), team_cache)
        if not home_team or not away_team:
            continue
        teams.add(home_team.external_id)
        teams.add(away_team.external_id)

        match, created, updated = upsert_match_from_api(
            item, competition, home_team, away_team
        )
        if match:
            matches_seen.add(match.external_id)
            if created:
                created_matches += 1
            elif updated:
                updated_matches += 1
            else:
                skipped_matches += 1

    return ImportSummary(
        competitions=len(competitions),
        teams=len(teams),
        matches=len(matches_seen),
        created_matches=created_matches,
        updated_matches=updated_matches,
        skipped_matches=skipped_matches,
    )


def import_matches_global_batched(
    date_from,
    date_to,
    competition_ids=None,
    client=None,
    *,
    raise_on_error: bool = False,
    max_range_days: int | None = None,
):
    try:
        start = _coerce_date(date_from)
        end = _coerce_date(date_to)
    except (TypeError, ValueError):
        return import_matches_global(
            date_from,
            date_to,
            competition_ids=competition_ids,
            client=client,
            raise_on_error=raise_on_error,
        )

    if start is None or end is None or start > end:
        return ImportSummary()

    max_days = int(
        max_range_days
        if max_range_days is not None
        else getattr(settings, "FOOTBALL_DATA_MATCHES_MAX_RANGE_DAYS", 10)
    )
    if max_days <= 0:
        max_days = 10

    total = ImportSummary()
    window_start = start
    while window_start <= end:
        window_end = min(window_start + timedelta(days=max_days - 1), end)
        summary = import_matches_global(
            window_start,
            window_end,
            competition_ids=competition_ids,
            client=client,
            raise_on_error=raise_on_error,
        )
        total = ImportSummary(
            competitions=total.competitions + summary.competitions,
            teams=total.teams + summary.teams,
            matches=total.matches + summary.matches,
            created_matches=total.created_matches + summary.created_matches,
            updated_matches=total.updated_matches + summary.updated_matches,
            skipped_matches=total.skipped_matches + summary.skipped_matches,
        )
        window_start = window_end + timedelta(days=1)

    return total


def upsert_competition_from_api(competition):
    external_id = competition.get("id")
    if not external_id:
        return None, False, False
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

    if not tournament:
        tournament = Tournament.objects.create(
            external_id=external_id,
            name=name,
            country=country,
            code=code,
            logo_url=emblem,
        )
        return tournament, True, False

    changed_fields = []
    for field_name, value in (
        ("external_id", external_id),
        ("name", name),
        ("country", country),
        ("code", code),
        ("logo_url", emblem),
    ):
        if getattr(tournament, field_name) != value:
            setattr(tournament, field_name, value)
            changed_fields.append(field_name)

    if changed_fields:
        tournament.save(update_fields=changed_fields)
        return tournament, False, True
    return tournament, False, False


def upsert_team_from_api(team_data):
    external_id = team_data.get("id")
    if not external_id:
        return None, False, False
    name = (
        team_data.get("name")
        or team_data.get("shortName")
        or team_data.get("tla")
        or ""
    )
    crest = team_data.get("crest") or team_data.get("crestUrl") or ""
    area = team_data.get("area") or {}
    country = area.get("name") or ""
    team = Team.objects.filter(external_id=external_id).first()
    if not team:
        team = Team.objects.filter(name__iexact=name, country=country).first()
        if team:
            team.external_id = external_id

    if not team:
        team = Team.objects.create(
            external_id=external_id,
            name=name,
            country=country,
            logo_url=crest,
        )
        return team, True, False

    changed_fields = []
    for field_name, value in (
        ("external_id", external_id),
        ("name", name),
        ("country", country),
        ("logo_url", crest),
    ):
        if getattr(team, field_name) != value:
            setattr(team, field_name, value)
            changed_fields.append(field_name)

    if changed_fields:
        team.save(update_fields=changed_fields)
        return team, False, True
    return team, False, False


def upsert_match_from_api(match_data, competition, home_team, away_team):
    external_id = match_data.get("id")
    if not external_id:
        return None, False, False
    date_time = _parse_datetime(match_data.get("utcDate"))
    if not date_time:
        return None, False, False
    status = match_data.get("status") or ""
    venue = match_data.get("venue") or ""
    home_score, away_score = _extract_score(match_data.get("score") or {})

    match = Match.objects.filter(external_id=external_id).first()
    if not match:
        match = Match.objects.filter(
            tournament=competition,
            home_team=home_team,
            away_team=away_team,
            date_time=date_time,
        ).first()
        if match:
            match.external_id = external_id

    if not match:
        match = Match.objects.create(
            external_id=external_id,
            tournament=competition,
            home_team=home_team,
            away_team=away_team,
            date_time=date_time,
            venue=venue,
            status=status,
            home_score=home_score,
            away_score=away_score,
        )
        return match, True, False

    changed_fields = []
    for field_name, value in (
        ("external_id", external_id),
        ("tournament", competition),
        ("home_team", home_team),
        ("away_team", away_team),
        ("date_time", date_time),
        ("venue", venue),
        ("status", status),
        ("home_score", home_score),
        ("away_score", away_score),
    ):
        if getattr(match, field_name) != value:
            setattr(match, field_name, value)
            changed_fields.append(field_name)

    if changed_fields:
        match.save(update_fields=changed_fields)
        return match, False, True
    return match, False, False


def _get_or_cache_competition(data, cache):
    external_id = data.get("id")
    if not external_id:
        return None, False, False
    if external_id in cache:
        return cache[external_id], False, False
    tournament, created, updated = upsert_competition_from_api(data)
    if tournament:
        cache[external_id] = tournament
    return tournament, created, updated


def _get_or_cache_team(data, cache):
    external_id = data.get("id")
    if not external_id:
        return None, False, False
    if external_id in cache:
        return cache[external_id], False, False
    team, created, updated = upsert_team_from_api(data)
    if team:
        cache[external_id] = team
    return team, created, updated


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


def _coerce_date(value):
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if hasattr(value, "date"):
        return value.date()
    return date.fromisoformat(str(value))


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
