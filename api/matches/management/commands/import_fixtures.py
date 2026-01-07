from datetime import date

from django.core.management.base import BaseCommand, CommandError

from matches.services.jobs import import_fixtures_once


class Command(BaseCommand):
    help = "Import fixtures for a date range from football-data.org."

    def add_arguments(self, parser):
        parser.add_argument(
            "--league",
            action="append",
            type=int,
            required=False,
            help="football-data competition id to filter. Repeatable.",
        )
        parser.add_argument(
            "--from",
            dest="date_from",
            required=True,
            help="Start date (YYYY-MM-DD).",
        )
        parser.add_argument(
            "--to",
            dest="date_to",
            required=True,
            help="End date (YYYY-MM-DD).",
        )

    def handle(self, *args, **options):
        league_ids = options.get("league")
        date_from = _parse_date(options["date_from"])
        date_to = _parse_date(options["date_to"])
        result = import_fixtures_once(
            leagues=league_ids,
            date_from=date_from,
            date_to=date_to,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported fixtures created={result.created_matches} "
                f"updated={result.updated_matches} skipped={result.skipped_matches} "
                f"(seen={result.matches})."
            )
        )


def _parse_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise CommandError("Dates must be in YYYY-MM-DD format.") from exc
