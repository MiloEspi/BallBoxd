from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from matches.models import Match
from matches.services.watchability import compute_watchability


class Command(BaseCommand):
    help = "Recompute watchability for a single match id."

    def add_arguments(self, parser):
        parser.add_argument("match_id", type=int, help="Match id to recompute.")

    def handle(self, *args, **options):
        match_id = options.get("match_id")
        if not match_id:
            raise CommandError("match_id is required.")

        try:
            match = Match.objects.get(pk=match_id)
        except Match.DoesNotExist as exc:
            raise CommandError("Match not found.") from exc

        result = compute_watchability(match.id)
        match.watchability_score = result["watchability"]
        match.watchability_confidence = result["confidence_label"]
        match.watchability_updated_at = timezone.now()
        match.save(
            update_fields=[
                "watchability_score",
                "watchability_confidence",
                "watchability_updated_at",
            ]
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Updated match {match.id} watchability to {match.watchability_score}."
            )
        )
