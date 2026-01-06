from datetime import date

from django.core.management.base import BaseCommand, CommandError

from matches.services.importers import import_matches_global


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
        summary = import_matches_global(
            date_from,
            date_to,
            competition_ids=league_ids,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {summary.matches} fixtures via global matches."
            )
        )


def _parse_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise CommandError("Dates must be in YYYY-MM-DD format.") from exc
