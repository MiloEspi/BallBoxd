from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from rest_framework.authtoken.models import Token

from matches.models import Match, Rating, Team, Tournament
from social.models import Follow, UserFollow


class Command(BaseCommand):
    help = "Seed basic data for local development."

    def handle(self, *args, **options):
        users = self._create_users()
        tournaments = self._create_tournaments()
        teams = self._create_teams()
        matches = self._create_matches(tournaments, teams)
        self._create_follows(users, teams)
        self._create_user_follows(users)
        self._create_ratings(users, matches)
        self.stdout.write(self.style.SUCCESS("Seed completed."))

    def _create_users(self):
        User = get_user_model()
        items = [
            {"username": "camilo", "email": "camilo@example.com", "password": "password123"},
            {"username": "alice", "email": "alice@example.com", "password": "password123"},
            {"username": "bob", "email": "bob@example.com", "password": "password123"},
        ]
        users = {}
        for item in items:
            user, created = User.objects.get_or_create(
                username=item["username"],
                defaults={"email": item["email"]},
            )
            if created:
                user.set_password(item["password"])
                user.save()
            Token.objects.get_or_create(user=user)
            users[item["username"]] = user
        return users

    def _create_tournaments(self):
        items = [
            {"name": "Premier League", "country": "England"},
            {"name": "La Liga", "country": "Spain"},
        ]
        tournaments = {}
        for item in items:
            tournament, _ = Tournament.objects.get_or_create(
                name=item["name"],
                country=item["country"],
            )
            tournaments[item["name"]] = tournament
        return tournaments

    def _create_teams(self):
        items = [
            {"name": "Arsenal", "country": "England"},
            {"name": "Manchester City", "country": "England"},
            {"name": "Liverpool", "country": "England"},
            {"name": "Barcelona", "country": "Spain"},
            {"name": "Real Madrid", "country": "Spain"},
        ]
        teams = {}
        for item in items:
            team, _ = Team.objects.get_or_create(
                name=item["name"],
                defaults={"country": item["country"]},
            )
            teams[item["name"]] = team
        return teams

    def _create_matches(self, tournaments, teams):
        base_time = timezone.now() - timedelta(days=3)
        items = [
            {
                "tournament": "Premier League",
                "home_team": "Arsenal",
                "away_team": "Manchester City",
                "date_time": base_time + timedelta(hours=2),
                "home_score": 2,
                "away_score": 2,
            },
            {
                "tournament": "Premier League",
                "home_team": "Liverpool",
                "away_team": "Arsenal",
                "date_time": base_time + timedelta(days=1, hours=1),
                "home_score": 1,
                "away_score": 3,
            },
            {
                "tournament": "La Liga",
                "home_team": "Barcelona",
                "away_team": "Real Madrid",
                "date_time": base_time + timedelta(days=2, hours=4),
                "home_score": 0,
                "away_score": 1,
            },
            {
                "tournament": "La Liga",
                "home_team": "Real Madrid",
                "away_team": "Barcelona",
                "date_time": base_time + timedelta(days=3, hours=6),
                "home_score": 2,
                "away_score": 2,
            },
        ]
        matches = {}
        for item in items:
            match, _ = Match.objects.get_or_create(
                tournament=tournaments[item["tournament"]],
                home_team=teams[item["home_team"]],
                away_team=teams[item["away_team"]],
                date_time=item["date_time"],
                defaults={
                    "home_score": item["home_score"],
                    "away_score": item["away_score"],
                },
            )
            matches[
                f'{item["home_team"]} vs {item["away_team"]} {item["tournament"]}'
            ] = match
        return matches

    def _create_follows(self, users, teams):
        Follow.objects.get_or_create(user=users["camilo"], team=teams["Arsenal"])
        Follow.objects.get_or_create(user=users["camilo"], team=teams["Barcelona"])
        Follow.objects.get_or_create(user=users["alice"], team=teams["Liverpool"])
        Follow.objects.get_or_create(user=users["bob"], team=teams["Real Madrid"])

    def _create_user_follows(self, users):
        UserFollow.objects.get_or_create(
            follower=users["camilo"],
            following=users["alice"],
        )
        UserFollow.objects.get_or_create(
            follower=users["camilo"],
            following=users["bob"],
        )
        UserFollow.objects.get_or_create(
            follower=users["alice"],
            following=users["camilo"],
        )

    def _create_ratings(self, users, matches):
        items = [
            {
                "user": "camilo",
                "match": "Arsenal vs Manchester City Premier League",
                "score": 85,
                "minutes_watched": Rating.MinutesWatched.FULL,
                "review": "Intense game and great quality.",
            },
            {
                "user": "alice",
                "match": "Arsenal vs Manchester City Premier League",
                "score": 78,
                "minutes_watched": Rating.MinutesWatched.ALMOST_ALL,
                "review": "",
            },
            {
                "user": "bob",
                "match": "Barcelona vs Real Madrid La Liga",
                "score": 90,
                "minutes_watched": Rating.MinutesWatched.FULL,
                "review": "Classic rivalry, loved it.",
            },
            {
                "user": "camilo",
                "match": "Liverpool vs Arsenal Premier League",
                "score": 72,
                "minutes_watched": Rating.MinutesWatched.ONE_HALF,
                "review": "Only caught the second half.",
            },
        ]
        for item in items:
            Rating.objects.update_or_create(
                user=users[item["user"]],
                match=matches[item["match"]],
                defaults={
                    "score": item["score"],
                    "minutes_watched": item["minutes_watched"],
                    "review": item["review"],
                },
            )
