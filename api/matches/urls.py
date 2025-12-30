from django.urls import path

from .views import MatchDetailView, MatchRatingView

urlpatterns = [
    path("<int:pk>/", MatchDetailView.as_view(), name="match-detail"),
    path("<int:pk>/rate/", MatchRatingView.as_view(), name="match-rate"),
]
