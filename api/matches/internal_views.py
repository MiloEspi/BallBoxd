import hmac
import json
import logging
from datetime import date

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from matches.services.jobs import import_fixtures_once, poll_matches_once

logger = logging.getLogger(__name__)


def _get_client_ip(request) -> str:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "")


def _rate_limit_ip(request, *, key_prefix: str, limit: int = 30, window_seconds: int = 60) -> bool:
    ip = _get_client_ip(request) or "unknown"
    key = f"{key_prefix}:{ip}"
    try:
        current = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)
        current = 1
    return current <= limit


def _extract_token(request) -> str:
    header = (request.META.get("HTTP_X_CRON_TOKEN") or "").strip()
    if header:
        return header
    return (request.GET.get("token") or "").strip()


def _is_authorized(request) -> bool:
    expected = (getattr(settings, "CRON_SECRET", "") or "").strip()
    provided = _extract_token(request)
    if not expected or not provided:
        return False
    return hmac.compare_digest(expected, provided)


def _unauthorized():
    return JsonResponse({"ok": False, "error": "unauthorized"}, status=401)


def _parse_json_body(request) -> dict:
    if not request.body:
        return {}
    content_type = (request.META.get("CONTENT_TYPE") or "").lower()
    if "application/json" not in content_type:
        return {}
    try:
        return json.loads(request.body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return {}


def _parse_leagues(value) -> list[int] | None:
    if value is None:
        return None
    if isinstance(value, list):
        items = value
    else:
        items = [part.strip() for part in str(value).split(",") if part.strip()]
    league_ids: list[int] = []
    for item in items:
        try:
            league_ids.append(int(item))
        except (TypeError, ValueError):
            continue
    return league_ids or None


def _parse_date_param(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return parse_date(str(value))


@csrf_exempt
@require_POST
def import_fixtures_view(request):
    if not _is_authorized(request):
        return _unauthorized()
    if not _rate_limit_ip(request, key_prefix="internal:import-fixtures"):
        return JsonResponse({"ok": False, "error": "rate_limited"}, status=429)

    body = _parse_json_body(request)
    leagues = _parse_leagues(
        body.get("leagues")
        or request.POST.get("leagues")
        or request.GET.get("leagues")
        or request.GET.getlist("league")
    )
    date_from = _parse_date_param(
        body.get("from")
        or body.get("date_from")
        or request.POST.get("from")
        or request.POST.get("date_from")
        or request.GET.get("from")
        or request.GET.get("date_from")
    )
    date_to = _parse_date_param(
        body.get("to")
        or body.get("date_to")
        or request.POST.get("to")
        or request.POST.get("date_to")
        or request.GET.get("to")
        or request.GET.get("date_to")
    )

    logger.info(
        "Internal import-fixtures start leagues=%s from=%s to=%s ip=%s",
        leagues,
        date_from,
        date_to,
        _get_client_ip(request),
    )
    try:
        result = import_fixtures_once(leagues=leagues, date_from=date_from, date_to=date_to)
    except Exception:
        logger.exception("Internal import-fixtures failed.")
        return JsonResponse({"ok": False, "error": "internal_error"}, status=500)
    logger.info(
        "Internal import-fixtures done created=%s updated=%s skipped=%s duration=%.3fs",
        result.created_matches,
        result.updated_matches,
        result.skipped_matches,
        result.duration_seconds,
    )
    return JsonResponse(
        {
            "ok": True,
            "created": result.created_matches,
            "updated": result.updated_matches,
            "skipped": result.skipped_matches,
            "duration_seconds": round(result.duration_seconds, 3),
            "competitions": result.competitions,
            "teams": result.teams,
            "matches_seen": result.matches,
        }
    )


@csrf_exempt
@require_POST
def poll_matches_view(request):
    if not _is_authorized(request):
        return _unauthorized()
    if not _rate_limit_ip(request, key_prefix="internal:poll-matches"):
        return JsonResponse({"ok": False, "error": "rate_limited"}, status=429)

    logger.info("Internal poll-matches start ip=%s", _get_client_ip(request))
    try:
        result = poll_matches_once()
    except Exception:
        logger.exception("Internal poll-matches failed.")
        return JsonResponse({"ok": False, "error": "internal_error"}, status=500)
    if result.skipped:
        logger.info(
            "Internal poll-matches skipped reason=%s duration=%.3fs",
            result.reason,
            result.duration_seconds,
        )
        return JsonResponse(
            {
                "ok": True,
                "skipped": True,
                "reason": result.reason,
                "last_run_seconds_ago": result.last_run_seconds_ago,
                "updated_matches": 0,
                "api_calls_used": 0,
                "duration_seconds": round(result.duration_seconds, 3),
            }
        )

    logger.info(
        "Internal poll-matches done updated=%s created=%s skipped=%s api_calls=%s duration=%.3fs",
        result.updated_matches,
        result.created_matches,
        result.skipped_matches,
        result.api_calls_used,
        result.duration_seconds,
    )
    return JsonResponse(
        {
            "ok": True,
            "skipped": False,
            "updated_matches": result.updated_matches,
            "api_calls_used": result.api_calls_used,
            "duration_seconds": round(result.duration_seconds, 3),
        }
    )
