import logging

from django.utils import timezone
from django.core.cache import cache

from .importers import get_default_date_range, import_matches_global, get_import_frequency_minutes

logger = logging.getLogger(__name__)


def poll_finished_matches(now=None, client=None):
    now = now or timezone.now()
    date_from, date_to = get_default_date_range(now)
    summary = import_matches_global(date_from, date_to, client=client)
    logger.info(
        "Global match sync competitions=%s teams=%s matches=%s created=%s updated=%s skipped=%s",
        summary.competitions,
        summary.teams,
        summary.matches,
        summary.created_matches,
        summary.updated_matches,
        summary.skipped_matches,
    )
    return summary


def poll_if_due(now=None, interval_minutes=None, cache_key="matches:poll:last_run"):
    now = now or timezone.now()
    interval_minutes = int(interval_minutes or get_import_frequency_minutes(now))
    if interval_minutes <= 0:
        return poll_finished_matches(now=now), True
    last_run = cache.get(cache_key)
    if last_run:
        elapsed = (now - last_run).total_seconds()
        if elapsed < interval_minutes * 60:
            logger.info(
                "Skipping poll; last run %ss ago (interval %sm).",
                int(elapsed),
                interval_minutes,
            )
            return None, False
    summary = poll_finished_matches(now=now)
    cache.set(cache_key, now, timeout=interval_minutes * 60)
    return summary, True
