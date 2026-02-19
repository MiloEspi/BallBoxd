import hmac
import json
import logging
import time
from datetime import date, timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from matches.services.football_data import FootballDataError
from matches.models import Match
from matches.services.bootstrap import bootstrap_once
from matches.services.jobs import import_fixtures_once, poll_matches_once
from matches.services.watchability import compute_watchability

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


def _parse_codes(value) -> list[str] | None:
    if value is None:
        return None
    if isinstance(value, list):
        items = value
    else:
        items = [part.strip() for part in str(value).split(",") if part.strip()]
    codes: list[str] = []
    for item in items:
        code = str(item).strip().upper()
        if code and code not in codes:
            codes.append(code)
    return codes or None


def _parse_date_param(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return parse_date(str(value))


def _parse_int_param(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _first_defined(*values):
    for value in values:
        if value is not None:
            return value
    return None


def _football_data_error_response(exc: FootballDataError):
    upstream_status = exc.status_code
    error_type = (getattr(exc, "error_type", None) or "football_data_error").strip()

    if upstream_status == 401 or error_type == "auth":
        status = 502
        reason = "football_data_unauthorized"
    elif upstream_status == 429 or error_type == "rate_limited":
        status = 429
        reason = "football_data_rate_limited"
    elif error_type == "config":
        status = 500
        reason = "football_data_not_configured"
    elif error_type == "timeout":
        status = 504
        reason = "football_data_timeout"
    elif upstream_status is not None and upstream_status >= 500:
        status = 503
        reason = "football_data_unavailable"
    elif error_type in {"network", "upstream"}:
        status = 503
        reason = "football_data_unavailable"
    else:
        status = 502
        reason = "football_data_error"

    payload = {
        "ok": False,
        "error": reason,
        "error_type": error_type,
        "upstream_status": upstream_status,
        "endpoint": exc.endpoint,
        "detail": str(exc),
        "retryable": bool(getattr(exc, "retryable", False)),
    }
    return JsonResponse(payload, status=status)


@csrf_exempt
@require_POST
def import_fixtures_view(request):
    if not _is_authorized(request):
        logger.warning("Internal import-fixtures unauthorized ip=%s", _get_client_ip(request))
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
    days_ahead = _parse_int_param(
        _first_defined(
            body.get("days_ahead"),
            request.POST.get("days_ahead"),
            request.GET.get("days_ahead"),
        )
    )
    days_back = _parse_int_param(
        _first_defined(
            body.get("days_back"),
            request.POST.get("days_back"),
            request.GET.get("days_back"),
        )
    )

    used_date_from = date_from
    used_date_to = date_to
    if used_date_from is None and used_date_to is None and (days_ahead is not None or days_back is not None):
        today = timezone.now().date()
        used_date_from = today - timedelta(days=max(0, int(days_back or 0)))
        used_date_to = today + timedelta(days=max(0, int(days_ahead or 0)))

    logger.info(
        "Internal import-fixtures start leagues=%s from=%s to=%s days_ahead=%s days_back=%s ip=%s",
        leagues,
        used_date_from,
        used_date_to,
        days_ahead,
        days_back,
        _get_client_ip(request),
    )
    try:
        result = import_fixtures_once(
            leagues=leagues,
            date_from=used_date_from,
            date_to=used_date_to,
            days_ahead=days_ahead,
            days_back=days_back,
        )
    except FootballDataError as exc:
        logger.error(
            "Internal import-fixtures football-data error status=%s endpoint=%s detail=%s",
            exc.status_code,
            exc.endpoint,
            exc,
        )
        return _football_data_error_response(exc)
    except Exception:
        logger.exception("Internal import-fixtures failed.")
        return JsonResponse(
            {
                "ok": False,
                "error": "internal_error",
                "reason": "unexpected_exception",
            },
            status=500,
        )
    logger.info(
        "Internal import-fixtures done created=%s updated=%s skipped=%s duration=%.3fs",
        result.created_matches,
        result.updated_matches,
        result.skipped_matches,
        result.duration_seconds,
    )
    logger.info(
        "Internal import-fixtures requests count in this run: %s",
        result.api_calls_used,
    )
    logger.info(
        "Internal import-fixtures inserted/updated fixtures: created=%s updated=%s",
        result.created_matches,
        result.updated_matches,
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
            "api_calls_used": result.api_calls_used,
            "date_from": used_date_from.isoformat() if used_date_from else None,
            "date_to": used_date_to.isoformat() if used_date_to else None,
        }
    )


@csrf_exempt
@require_POST
def poll_matches_view(request):
    if not _is_authorized(request):
        logger.warning("Internal poll-matches unauthorized ip=%s", _get_client_ip(request))
        return _unauthorized()
    if not _rate_limit_ip(request, key_prefix="internal:poll-matches"):
        return JsonResponse({"ok": False, "error": "rate_limited"}, status=429)

    logger.info("Internal poll-matches start ip=%s", _get_client_ip(request))
    try:
        result = poll_matches_once()
    except FootballDataError as exc:
        logger.error(
            "Internal poll-matches football-data error status=%s endpoint=%s detail=%s",
            exc.status_code,
            exc.endpoint,
            exc,
        )
        return _football_data_error_response(exc)
    except Exception:
        logger.exception("Internal poll-matches failed.")
        return JsonResponse(
            {
                "ok": False,
                "error": "internal_error",
                "reason": "unexpected_exception",
            },
            status=500,
        )
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
                "created_matches": 0,
                "matches_seen": 0,
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
            "created_matches": result.created_matches,
            "matches_seen": result.matches_seen,
            "competitions": result.competitions,
            "teams": result.teams,
            "api_calls_used": result.api_calls_used,
            "duration_seconds": round(result.duration_seconds, 3),
        }
    )


@csrf_exempt
@require_POST
def bootstrap_view(request):
    if not _is_authorized(request):
        logger.warning("Internal bootstrap unauthorized ip=%s", _get_client_ip(request))
        return _unauthorized()
    if not _rate_limit_ip(request, key_prefix="internal:bootstrap", limit=10, window_seconds=60):
        return JsonResponse({"ok": False, "error": "rate_limited"}, status=429)

    body = _parse_json_body(request)
    leagues = _parse_leagues(
        body.get("leagues")
        or request.POST.get("leagues")
        or request.GET.get("leagues")
        or request.GET.getlist("league")
    )
    codes = _parse_codes(
        body.get("codes")
        or body.get("code")
        or request.POST.get("codes")
        or request.POST.get("code")
        or request.GET.get("codes")
        or request.GET.getlist("code")
    )
    fixtures_days = _parse_int_param(
        _first_defined(
            body.get("fixtures_days"),
            body.get("days_ahead"),
            request.POST.get("fixtures_days"),
            request.POST.get("days_ahead"),
            request.GET.get("fixtures_days"),
            request.GET.get("days_ahead"),
        )
    )
    fixtures_days_back = _parse_int_param(
        _first_defined(
            body.get("fixtures_days_back"),
            body.get("days_back"),
            request.POST.get("fixtures_days_back"),
            request.POST.get("days_back"),
            request.GET.get("fixtures_days_back"),
            request.GET.get("days_back"),
        )
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
        "Internal bootstrap start leagues=%s codes=%s fixtures_days=%s fixtures_days_back=%s from=%s to=%s ip=%s",
        leagues,
        codes,
        fixtures_days,
        fixtures_days_back,
        date_from,
        date_to,
        _get_client_ip(request),
    )
    try:
        result = bootstrap_once(
            leagues=leagues,
            codes=codes,
            fixtures_days=fixtures_days,
            fixtures_days_back=fixtures_days_back,
            date_from=date_from,
            date_to=date_to,
        )
    except FootballDataError as exc:
        logger.error(
            "Internal bootstrap football-data error status=%s endpoint=%s detail=%s",
            exc.status_code,
            exc.endpoint,
            exc,
        )
        return _football_data_error_response(exc)
    except Exception:
        logger.exception("Internal bootstrap failed.")
        return JsonResponse(
            {
                "ok": False,
                "error": "internal_error",
                "reason": "unexpected_exception",
            },
            status=500,
        )

    logger.info(
        "Internal bootstrap done: competitions %s, teams %s, api_calls=%s, duration=%.3fs",
        result.competitions,
        result.teams,
        result.api_calls_used,
        result.duration_seconds,
    )
    return JsonResponse(
        {
            "ok": True,
            "competitions": result.competitions,
            "teams": result.teams,
            "fixtures": {
                "matches_seen": result.fixtures_matches,
                "created": result.fixtures_created,
                "updated": result.fixtures_updated,
                "skipped": result.fixtures_skipped,
                "date_from": result.fixtures_date_from.isoformat()
                if result.fixtures_date_from
                else None,
                "date_to": result.fixtures_date_to.isoformat()
                if result.fixtures_date_to
                else None,
            },
            "api_calls_used": result.api_calls_used,
            "duration_seconds": round(result.duration_seconds, 3),
        }
    )


@csrf_exempt
@require_POST
def recompute_watchability_view(request):
    if not _is_authorized(request):
        logger.warning(
            "Internal recompute-watchability unauthorized ip=%s",
            _get_client_ip(request),
        )
        return _unauthorized()
    if not _rate_limit_ip(request, key_prefix="internal:recompute-watchability"):
        return JsonResponse({"ok": False, "error": "rate_limited"}, status=429)

    body = _parse_json_body(request)
    days = _parse_int_param(
        _first_defined(
            body.get("days"),
            request.POST.get("days"),
            request.GET.get("days"),
        )
    )
    days = max(int(days) if days is not None else 7, 0)

    now = timezone.now()
    end = now + timedelta(days=days)
    start_time = time.monotonic()

    logger.info(
        "Internal recompute-watchability start days=%s source=db-only ip=%s",
        days,
        _get_client_ip(request),
    )
    try:
        matches = Match.objects.filter(date_time__gte=now, date_time__lte=end)
        total = matches.count()
        updated = 0

        for match in matches:
            result = compute_watchability(match.id)
            match.watchability_score = result["watchability"]
            match.watchability_confidence = result["confidence_label"]
            match.watchability_updated_at = now
            match.save(
                update_fields=[
                    "watchability_score",
                    "watchability_confidence",
                    "watchability_updated_at",
                ]
            )
            updated += 1
    except Exception:
        logger.exception("Internal recompute-watchability failed.")
        return JsonResponse(
            {
                "ok": False,
                "error": "internal_error",
                "reason": "unexpected_exception",
            },
            status=500,
        )

    duration = time.monotonic() - start_time
    logger.info(
        "Internal recompute-watchability done updated=%s total=%s days=%s duration=%.3fs",
        updated,
        total,
        days,
        duration,
    )
    return JsonResponse(
        {
            "ok": True,
            "updated": updated,
            "total": total,
            "days": days,
            "source": "db_only",
            "date_from": now.isoformat(),
            "date_to": end.isoformat(),
            "duration_seconds": round(duration, 3),
        }
    )
