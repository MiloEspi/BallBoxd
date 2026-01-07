from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from matches.models import Match, Team, Tournament


class RatingGuardTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="tester",
            password="password123",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.tournament = Tournament.objects.create(name="Test League", country="Test")
        self.home = Team.objects.create(name="Home FC", country="Test")
        self.away = Team.objects.create(name="Away FC", country="Test")

    def test_cannot_rate_future_match(self):
        match = Match.objects.create(
            tournament=self.tournament,
            home_team=self.home,
            away_team=self.away,
            date_time=timezone.now() + timedelta(hours=2),
            status="SCHEDULED",
        )
        response = self.client.post(
            f"/api/v1/matches/{match.id}/rate/",
            data={"score": 80, "minutes_watched": "FULL", "review": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json().get("detail"), "Match has not started yet.")

    def test_can_rate_past_match(self):
        match = Match.objects.create(
            tournament=self.tournament,
            home_team=self.home,
            away_team=self.away,
            date_time=timezone.now() - timedelta(hours=2),
            status="FINISHED",
            home_score=1,
            away_score=0,
        )
        response = self.client.post(
            f"/api/v1/matches/{match.id}/rate/",
            data={"score": 80, "minutes_watched": "FULL", "review": ""},
            format="json",
        )
        self.assertEqual(response.status_code, 201)

