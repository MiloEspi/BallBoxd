from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token

from matches.models import Match, Rating, Team, Tournament
from social.models import UserFollow


class FriendsFeedTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.viewer = User.objects.create_user(
            username="viewer", password="testpass123"
        )
        self.friend = User.objects.create_user(
            username="friend", password="testpass123"
        )
        self.token = Token.objects.create(user=self.viewer)
        UserFollow.objects.create(follower=self.viewer, following=self.friend)

        self.tournament = Tournament.objects.create(name="Liga Test")
        self.home_team = Team.objects.create(name="Team A")
        self.away_team = Team.objects.create(name="Team B")
        self.match = Match.objects.create(
            tournament=self.tournament,
            home_team=self.home_team,
            away_team=self.away_team,
            date_time="2026-01-01T12:00:00Z",
        )
        Rating.objects.create(
            user=self.friend,
            match=self.match,
            score=80,
            minutes_watched=Rating.MinutesWatched.FULL,
        )

    def test_friends_feed_returns_activity(self):
        url = reverse("friends-feed")
        response = self.client.get(
            url, HTTP_AUTHORIZATION=f"Token {self.token.key}"
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["total"], 1)
        self.assertEqual(payload["results"][0]["actor"]["username"], "friend")
        self.assertEqual(
            payload["results"][0]["match"]["tournament"], "Liga Test"
        )
