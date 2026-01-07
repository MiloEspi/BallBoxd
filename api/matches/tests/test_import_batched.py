from django.test import TestCase

from matches.services.importers import import_matches_global_batched


class ImportMatchesBatchedTests(TestCase):
    def test_import_matches_global_batched_splits_range(self):
        calls = []

        class FakeClient:
            async def get_matches_global(self, date_from, date_to):
                calls.append((date_from, date_to))
                return {"matches": []}

        summary = import_matches_global_batched(
            "2026-01-01",
            "2026-01-12",
            client=FakeClient(),
            max_range_days=5,
        )

        self.assertEqual(summary.matches, 0)
        self.assertEqual(len(calls), 3)
        self.assertEqual(calls[0], ("2026-01-01", "2026-01-05"))
        self.assertEqual(calls[1], ("2026-01-06", "2026-01-10"))
        self.assertEqual(calls[2], ("2026-01-11", "2026-01-12"))

