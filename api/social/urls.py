from django.urls import path

from .views import (
    FeedView,
    MeView,
    ProfileActivityView,
    ProfileHighlightsView,
    ProfileStatsView,
    ProfileView,
    SearchView,
    TeamDetailView,
    TeamMatchesView,
    TeamsView,
    TeamFollowView,
    UserFollowView,
)

urlpatterns = [
    path("feed/", FeedView.as_view(), name="feed"),
    path("profile/<str:username>/", ProfileView.as_view(), name="profile"),
    path("search/", SearchView.as_view(), name="search"),
    path(
        "profile/<str:username>/stats/",
        ProfileStatsView.as_view(),
        name="profile-stats",
    ),
    path(
        "profile/<str:username>/activity/",
        ProfileActivityView.as_view(),
        name="profile-activity",
    ),
    path(
        "profile/<str:username>/highlights/",
        ProfileHighlightsView.as_view(),
        name="profile-highlights",
    ),
    path("teams/", TeamsView.as_view(), name="teams"),
    path("teams/<int:pk>/", TeamDetailView.as_view(), name="team-detail"),
    path(
        "teams/<int:pk>/matches/",
        TeamMatchesView.as_view(),
        name="team-matches",
    ),
    path("teams/<int:pk>/follow/", TeamFollowView.as_view(), name="team-follow"),
    path("users/<int:pk>/follow/", UserFollowView.as_view(), name="user-follow"),
    path("me/", MeView.as_view(), name="me"),
]
