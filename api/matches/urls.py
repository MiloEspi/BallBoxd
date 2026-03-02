from django.urls import path

from .views import MatchDetailView, MatchListView, MatchMemoryView, MatchRatingView

urlpatterns = [
    path("", MatchListView.as_view(), name="match-list"),
    path("<int:pk>/", MatchDetailView.as_view(), name="match-detail"),
    path("<int:pk>/rate/", MatchRatingView.as_view(), name="match-rate"),
    path("<int:pk>/memory/", MatchMemoryView.as_view(), name="match-memory"),
]
