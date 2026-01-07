import asyncio
from unittest.mock import AsyncMock, patch

from django.test import TestCase

from matches.models import Match, Team, Tournament
from matches.services.football_data import FootballDataClient
from matches.services.importers import import_matches_global


class FootballDataClientTests(TestCase):
    def test_request_retries_on_429(self):
        responses = [
            _FakeResponse(
                status_code=429,
                payload={"message": "rate limit"},
                headers={"X-RequestCounter-Reset": "0"},
            ),
            _FakeResponse(status_code=200, payload={"matches": []}, headers={}),
        ]

        class FakeAsyncClient:
            def __init__(self, *args, **kwargs):
                pass

            async def __aenter__(self):
                return self

            async def __aexit__(self, exc_type, exc, tb):
                return False

            async def get(self, url, params=None, headers=None):
                return responses.pop(0)

        client = FootballDataClient(
            token="test-token",
            base_url="https://api.football-data.org/v4",
        )

        async def run():
            return await client.get_matches_global("2024-01-01", "2024-01-01")

        with patch(
            "matches.services.football_data.httpx.AsyncClient",
            new=FakeAsyncClient,
        ), patch(
            "matches.services.football_data.asyncio.sleep",
            new=AsyncMock(),
        ):
            payload = asyncio.run(run())

        self.assertEqual(payload, {"matches": []})


class ImportMatchesTests(TestCase):
    def test_import_matches_global_upserts(self):
        payload = {
            "matches": [
                {
                    "id": 3001,
                    "utcDate": "2024-01-01T12:00:00Z",
                    "status": "FINISHED",
                    "competition": {
                        "id": 2001,
                        "name": "Premier League",
                        "code": "PL",
                        "emblem": "https://example.com/pl.png",
                        "area": {"name": "England"},
                    },
                    "homeTeam": {
                        "id": 1001,
                        "name": "Arsenal FC",
                        "shortName": "Arsenal",
                        "tla": "ARS",
                        "crest": "https://example.com/ars.png",
                    },
                    "awayTeam": {
                        "id": 1002,
                        "name": "Chelsea FC",
                        "shortName": "Chelsea",
                        "tla": "CHE",
                        "crest": "https://example.com/che.png",
                    },
                    "score": {
                        "fullTime": {"home": 2, "away": 1},
                        "regularTime": {"home": 2, "away": 1},
                    },
                }
            ]
        }

        class FakeClient:
            async def get_matches_global(self, date_from, date_to):
                return payload

        summary = import_matches_global(
            "2024-01-01",
            "2024-01-01",
            client=FakeClient(),
        )

        self.assertEqual(summary.matches, 1)
        self.assertEqual(summary.teams, 2)
        self.assertEqual(summary.competitions, 1)
        self.assertEqual(summary.created_matches, 1)
        self.assertEqual(summary.updated_matches, 0)
        self.assertEqual(summary.skipped_matches, 0)

        tournament = Tournament.objects.get(external_id=2001)
        self.assertEqual(tournament.code, "PL")
        self.assertEqual(tournament.logo_url, "https://example.com/pl.png")

        self.assertTrue(Team.objects.filter(external_id=1001).exists())
        self.assertTrue(Team.objects.filter(external_id=1002).exists())

        match = Match.objects.get(external_id=3001)
        self.assertEqual(match.home_score, 2)
        self.assertEqual(match.away_score, 1)

        summary_again = import_matches_global(
            "2024-01-01",
            "2024-01-01",
            client=FakeClient(),
        )
        self.assertEqual(summary_again.matches, 1)
        self.assertEqual(summary_again.created_matches, 0)
        self.assertEqual(summary_again.updated_matches, 0)
        self.assertEqual(summary_again.skipped_matches, 1)


class _FakeResponse:
    def __init__(self, status_code, payload, headers=None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}

    def json(self):
        return self._payload
