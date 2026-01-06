from django.core.management.base import BaseCommand

from matches.services.importers import import_competitions_tier_one


class Command(BaseCommand):
    help = "Import competitions from football-data.org."

    def add_arguments(self, parser):
        parser.add_argument(
            "--league",
            action="append",
            type=int,
            required=False,
            help="football-data competition id. Repeatable.",
        )
        parser.add_argument(
            "--code",
            action="append",
            type=str,
            required=False,
            help="Competition code filter (example: PL). Repeatable.",
        )

    def handle(self, *args, **options):
        league_ids = options.get("league")
        codes = options.get("code")
        summary = import_competitions_tier_one(
            competition_ids=league_ids,
            codes=codes,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Imported {summary.competitions} competitions."
            )
        )
