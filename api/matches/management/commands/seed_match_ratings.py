import random
from typing import Iterable

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from matches.models import Match, Rating
from matches.services.watchability import compute_watchability


class Command(BaseCommand):
    help = "Seed ratings for existing matches and recompute watchability."

    def add_arguments(self, parser):
        parser.add_argument(
            "--per-match",
            type=int,
            default=50,
            help="Number of ratings to create per match.",
        )
        parser.add_argument(
            "--min-score",
            type=int,
            default=35,
            help="Minimum score bound (0-100).",
        )
        parser.add_argument(
            "--max-score",
            type=int,
            default=95,
            help="Maximum score bound (0-100).",
        )

    def handle(self, *args, **options):
        per_match = max(int(options["per_match"]), 1)
        min_score = max(0, min(100, int(options["min_score"])))
        max_score = max(0, min(100, int(options["max_score"])))
        if min_score > max_score:
            min_score, max_score = max_score, min_score

        User = get_user_model()
        users = list(User.objects.all())
        if len(users) < per_match:
            users = self._ensure_users(User, per_match, users)

        matches = list(Match.objects.all())
        if not matches:
            self.stdout.write(self.style.WARNING("No matches found."))
            return

        total_created = 0
        for match in matches:
            created, users = self._seed_for_match(
                match,
                users,
                per_match,
                min_score,
                max_score,
                User,
            )
            total_created += created
            self._update_watchability(match)

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {total_created} ratings across {len(matches)} matches."
            )
        )

    def _ensure_users(self, User, target: int, existing: list):
        needed = max(0, target - len(existing))
        if needed <= 0:
            return existing
        created = []
        base = User.objects.count() + 1
        for index in range(needed):
            username = f"seed_user_{base + index}"
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={"email": f"{username}@example.com"},
            )
            created.append(user)
        return existing + created

    def _pick_score(self, mean: float, std: float, min_score: int, max_score: int) -> int:
        score = int(round(random.gauss(mean, std)))
        return max(min_score, min(max_score, score))

    def _pick_minutes(self) -> str:
        options = [
            Rating.MinutesWatched.LT_30,
            Rating.MinutesWatched.ONE_HALF,
            Rating.MinutesWatched.ALMOST_ALL,
            Rating.MinutesWatched.FULL,
        ]
        weights = [0.12, 0.2, 0.33, 0.35]
        return random.choices(options, weights=weights, k=1)[0]

    def _seed_for_match(
        self,
        match: Match,
        users: list,
        per_match: int,
        min_score: int,
        max_score: int,
        User,
    ) -> tuple[int, list]:
        existing_ids = set(
            Rating.objects.filter(match=match).values_list("user_id", flat=True)
        )
        available = [user for user in users if user.id not in existing_ids]
        if len(available) < per_match:
            users = self._ensure_users(User, per_match, users)
            available = [user for user in users if user.id not in existing_ids]
        if not available:
            return 0, users
        selected = (
            random.sample(available, k=min(per_match, len(available)))
            if len(available) >= per_match
            else available
        )

        base_mean = 68 + (match.tournament_id % 7) * 2
        std = 12
        ratings: Iterable[Rating] = [
            Rating(
                user=user,
                match=match,
                score=self._pick_score(base_mean, std, min_score, max_score),
                minutes_watched=self._pick_minutes(),
                review="",
                attended=random.random() < 0.08,
            )
            for user in selected
        ]
        with transaction.atomic():
            Rating.objects.bulk_create(ratings)
        return len(selected), users

    def _update_watchability(self, match: Match) -> None:
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
