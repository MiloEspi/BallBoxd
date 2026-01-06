from datetime import date

from django.core.management.base import BaseCommand, CommandError

from matches.services.importers import get_default_date_range, import_matches_global


class Command(BaseCommand):
    help = "Import teams by syncing matches from football-data.org."

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
            required=False,
            help="Start date (YYYY-MM-DD). Defaults to configured range.",
        )
        parser.add_argument(
            "--to",
            dest="date_to",
            required=False,
            help="End date (YYYY-MM-DD). Defaults to configured range.",
        )

    def handle(self, *args, **options):
        league_ids = options.get("league")
        date_from = options.get("date_from")
        date_to = options.get("date_to")
        if date_from and date_to:
            range_from = _parse_date(date_from)
            range_to = _parse_date(date_to)
        else:
            range_from, range_to = get_default_date_range()
        summary = import_matches_global(
            range_from,
            range_to,
            competition_ids=league_ids,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {summary.teams} teams via global matches."
            )
        )


def _parse_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise CommandError("Dates must be in YYYY-MM-DD format.") from exc
