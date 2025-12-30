from django.urls import path

from .views import FeedView, MeView, ProfileView, TeamFollowView, UserFollowView

urlpatterns = [
    path("feed/", FeedView.as_view(), name="feed"),
    path("profile/<str:username>/", ProfileView.as_view(), name="profile"),
    path("teams/<int:pk>/follow/", TeamFollowView.as_view(), name="team-follow"),
    path("users/<int:pk>/follow/", UserFollowView.as_view(), name="user-follow"),
    path("me/", MeView.as_view(), name="me"),
]
