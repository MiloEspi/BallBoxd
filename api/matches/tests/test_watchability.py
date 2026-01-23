from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from django.contrib.auth import get_user_model

from matches.models import Match, Rating, Team, Tournament
from matches.services.watchability import compute_watchability


class WatchabilityTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="watcher", password="testpass123"
        )
        self.tournament = Tournament.objects.create(name="Test League")
        self.team_a = Team.objects.create(name="Team A")
        self.team_b = Team.objects.create(name="Team B")
        self.team_c = Team.objects.create(name="Team C")
        self.team_d = Team.objects.create(name="Team D")

    def _create_match(self, home, away, days_offset):
        return Match.objects.create(
            tournament=self.tournament,
            home_team=home,
            away_team=away,
            date_time=timezone.now() + timedelta(days=days_offset),
        )

    def _rate_match(self, match, score):
        Rating.objects.create(
            user=self.user,
            match=match,
            score=score,
            minutes_watched=Rating.MinutesWatched.FULL,
        )

    def test_watchability_fallbacks_to_global_mean(self):
        target = self._create_match(self.team_a, self.team_b, 2)

        result = compute_watchability(target.id)

        self.assertEqual(result["watchability"], 68)
        self.assertEqual(result["confidence_label"], "Medium")

    def test_watchability_with_history(self):
        target = self._create_match(self.team_a, self.team_b, 2)

        home_scores = [80, 70, 60]
        away_scores = [90, 75, 65]

        for offset, score in enumerate(home_scores, start=1):
            match = self._create_match(self.team_a, self.team_c, -offset)
            self._rate_match(match, score)

        for offset, score in enumerate(away_scores, start=1):
            match = self._create_match(self.team_d, self.team_b, -offset)
            self._rate_match(match, score)

        result = compute_watchability(target.id)

        self.assertTrue(0 <= result["watchability"] <= 100)
        self.assertIn(result["confidence_label"], {"Low", "Medium", "High"})
