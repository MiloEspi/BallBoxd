import json
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.urls import reverse

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

