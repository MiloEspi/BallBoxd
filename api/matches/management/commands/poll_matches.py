import time

from django.core.management.base import BaseCommand, CommandError

from matches.services.importers import get_import_frequency_minutes
from matches.services.jobs import poll_matches_once


class Command(BaseCommand):
    help = "Poll football-data.org for match updates on a fixed interval."

    def add_arguments(self, parser):
        parser.add_argument(
            "--interval",
            type=int,
            required=False,
            help="Minutes between polls. Defaults to configured frequency.",
        )
        parser.add_argument(
            "--once",
            action="store_true",
            help="Run a single poll and exit.",
        )
        parser.add_argument(
            "--no-cache",
            action="store_true",
            help="Ignore last-run cache and always poll.",
        )

    def handle(self, *args, **options):
        interval = options.get("interval")
        if interval is not None and interval < 0:
            raise CommandError("Interval must be a positive integer.")
        run_once = options.get("once")
        use_cache = not options.get("no_cache")

        while True:
            interval_minutes = interval if interval is not None else get_import_frequency_minutes()
            result = poll_matches_once(interval_minutes=interval_minutes, use_cache=use_cache)
            if result.skipped:
                self.stdout.write("Skipping poll; last run within interval.")
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Polled matches competitions={result.competitions} "
                        f"teams={result.teams} matches={result.matches_seen}."
                    )
                )

            if run_once:
                break
            if interval_minutes <= 0:
                break
            time.sleep(interval_minutes * 60)
