import logging

from django.utils import timezone

from .importers import get_default_date_range, import_matches_global

logger = logging.getLogger(__name__)


def poll_finished_matches(now=None, client=None):
    now = now or timezone.now()
    date_from, date_to = get_default_date_range(now)
    summary = import_matches_global(date_from, date_to, client=client)
    logger.info(
        "Global match sync competitions=%s teams=%s matches=%s",
        summary.competitions,
        summary.teams,
        summary.matches,
    )
    return summary
