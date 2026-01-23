from django.urls import path

from .internal_views import (
    import_fixtures_view,
    poll_matches_view,
    recompute_watchability_view,
)

urlpatterns = [
    path("import-fixtures", import_fixtures_view, name="internal-import-fixtures"),
    path("import-fixtures/", import_fixtures_view),
    path("poll-matches", poll_matches_view, name="internal-poll-matches"),
    path("poll-matches/", poll_matches_view),
    path(
        "recompute-watchability",
        recompute_watchability_view,
        name="internal-recompute-watchability",
    ),
    path("recompute-watchability/", recompute_watchability_view),
]
