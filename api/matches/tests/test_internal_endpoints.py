import json
from datetime import date
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from matches.models import Match, Team, Tournament
from matches.services.bootstrap import BootstrapResult
from matches.services.football_data import FootballDataError
from matches.services.jobs import ImportFixturesResult, PollMatchesResult


@override_settings(CRON_SECRET="test-secret")
class InternalEndpointsTests(TestCase):
    def test_poll_matches_requires_token(self):
        url = reverse("internal-poll-matches")
        response = self.client.post(url)
        self.assertEqual(response.status_code, 401)

    def test_poll_matches_skips_when_recent(self):
        url = reverse("internal-poll-matches")
        fake = PollMatchesResult(
            skipped=True,
            reason="last run 30s ago (< 10m)",
            last_run_seconds_ago=30,
            updated_matches=0,
            created_matches=0,
            skipped_matches=0,
            matches_seen=0,
            competitions=0,
            teams=0,
            api_calls_used=0,
            duration_seconds=0.01,
        )
        with patch("matches.internal_views.poll_matches_once", return_value=fake):
            response = self.client.post(url, HTTP_X_CRON_TOKEN="test-secret")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertTrue(data["skipped"])
        self.assertEqual(data["last_run_seconds_ago"], 30)

    def test_import_fixtures_parses_params(self):
        url = reverse("internal-import-fixtures")
        fake = ImportFixturesResult(
            competitions=1,
            teams=2,
            matches=3,
            created_matches=1,
            updated_matches=1,
            skipped_matches=1,
            api_calls_used=1,
            duration_seconds=0.02,
        )
        payload = {"leagues": [39, 140], "from": "2024-01-01", "to": "2024-01-31"}
        with patch("matches.internal_views.import_fixtures_once", return_value=fake) as mocked:
            response = self.client.post(
                url,
                data=json.dumps(payload),
                content_type="application/json",
                HTTP_X_CRON_TOKEN="test-secret",
            )
        self.assertEqual(response.status_code, 200)
        mocked.assert_called_once()
        _, kwargs = mocked.call_args
        self.assertEqual(kwargs["leagues"], [39, 140])
        self.assertEqual(kwargs["date_from"].isoformat(), "2024-01-01")
        self.assertEqual(kwargs["date_to"].isoformat(), "2024-01-31")
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["created"], 1)
        self.assertEqual(data["updated"], 1)
        self.assertEqual(data["skipped"], 1)

    def test_import_fixtures_accepts_days_ahead(self):
        url = reverse("internal-import-fixtures") + "?days_ahead=30"
        fake = ImportFixturesResult(
            competitions=0,
            teams=0,
            matches=0,
            created_matches=0,
            updated_matches=0,
            skipped_matches=0,
            api_calls_used=0,
            duration_seconds=0.01,
        )
        with patch("matches.internal_views.import_fixtures_once", return_value=fake) as mocked:
            response = self.client.post(url, HTTP_X_CRON_TOKEN="test-secret")
        self.assertEqual(response.status_code, 200)
        _, kwargs = mocked.call_args
        self.assertEqual(kwargs["days_ahead"], 30)

    def test_import_fixtures_returns_429_on_rate_limit(self):
        url = reverse("internal-import-fixtures")
        error = FootballDataError(
            "football-data rate limit exceeded (429).",
            status_code=429,
            endpoint="/matches",
            error_type="rate_limited",
            retryable=True,
        )
        with patch("matches.internal_views.import_fixtures_once", side_effect=error):
            response = self.client.post(url, HTTP_X_CRON_TOKEN="test-secret")

        self.assertEqual(response.status_code, 429)
        payload = response.json()
        self.assertFalse(payload["ok"])
        self.assertEqual(payload["error"], "football_data_rate_limited")
        self.assertEqual(payload["upstream_status"], 429)
        self.assertTrue(payload["retryable"])

    def test_bootstrap_runs_and_returns_summary(self):
        url = reverse("internal-bootstrap")
        fake = BootstrapResult(
            competitions=4,
            teams=80,
            fixtures_matches=10,
            fixtures_created=8,
            fixtures_updated=2,
            fixtures_skipped=0,
            fixtures_date_from=date(2026, 2, 19),
            fixtures_date_to=date(2026, 2, 21),
            api_calls_used=7,
            duration_seconds=1.25,
        )
        payload = {"codes": ["PL", "PD"], "fixtures_days": 2}
        with patch("matches.internal_views.bootstrap_once", return_value=fake) as mocked:
            response = self.client.post(
                url,
                data=json.dumps(payload),
                content_type="application/json",
                HTTP_X_CRON_TOKEN="test-secret",
            )

        self.assertEqual(response.status_code, 200)
        mocked.assert_called_once()
        _, kwargs = mocked.call_args
        self.assertEqual(kwargs["codes"], ["PL", "PD"])
        self.assertEqual(kwargs["fixtures_days"], 2)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["competitions"], 4)
        self.assertEqual(data["teams"], 80)
        self.assertEqual(data["fixtures"]["created"], 8)
        self.assertEqual(data["api_calls_used"], 7)

    def test_recompute_watchability_updates_matches(self):
        tournament = Tournament.objects.create(name="Test League")
        home = Team.objects.create(name="Home")
        away = Team.objects.create(name="Away")
        match = Match.objects.create(
            tournament=tournament,
            home_team=home,
            away_team=away,
            date_time=timezone.now() + timezone.timedelta(days=1),
        )

        url = reverse("internal-recompute-watchability")
        fake = {"watchability": 70, "confidence_label": "Low"}
        with patch("matches.internal_views.compute_watchability", return_value=fake):
            response = self.client.post(url, HTTP_X_CRON_TOKEN="test-secret")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["updated"], 1)
        self.assertEqual(data["source"], "db_only")
        match.refresh_from_db()
        self.assertEqual(match.watchability_score, 70)
        self.assertEqual(match.watchability_confidence, "Low")
        self.assertIsNotNone(match.watchability_updated_at)
