from django.urls import path

from .views import (
    FeedView,
    FriendsFeedView,
    MeView,
    ProfileActivityView,
    ProfileHighlightsView,
    ProfileMemoriesView,
    ProfileMemoryDetailView,
    ProfileRatedMatchesView,
    ProfileStatsView,
    ProfileTeamsView,
    ProfileView,
    PublicProfileView,
    SearchView,
    TeamDetailView,
    TeamFollowView,
    TeamMatchesView,
    TeamsView,
    UserFollowByUsernameView,
    UserFollowView,
)

urlpatterns = [
    path("feed/", FeedView.as_view(), name="feed"),
    path("feed/friends/", FriendsFeedView.as_view(), name="friends-feed"),
    path("me/", MeView.as_view(), name="me"),
    path("teams/", TeamsView.as_view(), name="teams"),
    path("teams/<int:pk>/", TeamDetailView.as_view(), name="team-detail"),
    path("teams/<int:pk>/matches/", TeamMatchesView.as_view(), name="team-matches"),
    path("teams/<int:pk>/follow/", TeamFollowView.as_view(), name="team-follow"),
    path("users/<int:pk>/follow/", UserFollowView.as_view(), name="user-follow"),
    path(
        "users/<str:username>/follow/",
        UserFollowByUsernameView.as_view(),
        name="user-follow-username",
    ),
    path(
        "users/<str:username>/public/",
        PublicProfileView.as_view(),
        name="public-profile",
    ),
    path("profile/<str:username>/", ProfileView.as_view(), name="profile"),
    path("profile/<str:username>/teams/", ProfileTeamsView.as_view(), name="profile-teams"),
    path("profile/<str:username>/stats/", ProfileStatsView.as_view(), name="profile-stats"),
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
    path(
        "profile/<str:username>/ratings/",
        ProfileRatedMatchesView.as_view(),
        name="profile-ratings",
    ),
    path(
        "profile/<str:username>/memories/",
        ProfileMemoriesView.as_view(),
        name="profile-memories",
    ),
    path(
        "profile/<str:username>/memories/<int:match_id>/",
        ProfileMemoryDetailView.as_view(),
        name="profile-memory-detail",
    ),
    path("search/", SearchView.as_view(), name="search"),
]
