from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from matches.models import Match
from matches.services.watchability import compute_watchability


class Command(BaseCommand):
    help = "Recompute watchability for upcoming fixtures in a date range."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=7,
            help="How many days ahead to include (default: 7).",
        )

    def handle(self, *args, **options):
        days = max(int(options.get("days") or 7), 0)
        now = timezone.now()
        end = now + timedelta(days=days)

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

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated watchability for {updated} of {total} matches."
            )
        )
