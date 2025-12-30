from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import UserFollow
from .models import Match, Rating
from .serializers import (
    MatchDetailResponseSerializer,
    RatingSerializer,
    RatingUpsertSerializer,
)


class MatchDetailView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns match details with aggregate stats and context.
    def get(self, request, pk):
        match = get_object_or_404(
            Match.objects.select_related(
                "tournament",
                "home_team",
                "away_team",
            ),
            pk=pk,
        )

        ratings_qs = Rating.objects.filter(match=match).select_related("user")
        my_rating = ratings_qs.filter(user=request.user).first()
        agg = ratings_qs.aggregate(
            avg_score=Avg("score"),
            rating_count=Count("id"),
        )

        rating_count = agg["rating_count"] or 0
        avg_score = float(agg["avg_score"] or 0)

        if rating_count:
            full_count = ratings_qs.filter(
                minutes_watched=Rating.MinutesWatched.FULL
            ).count()
            full_pct = round((full_count / rating_count) * 100, 2)
        else:
            full_pct = 0.0

        featured_reviews = ratings_qs.exclude(review="").order_by("-created_at")[:3]

        following_ids = UserFollow.objects.filter(
            follower=request.user
        ).values_list("following_id", flat=True)
        followed_ratings = ratings_qs.filter(user_id__in=following_ids).order_by(
            "-created_at"
        )[:10]

        payload = {
            "match": match,
            "avg_score": avg_score,
            "rating_count": rating_count,
            "full_watched_pct": full_pct,
            "featured_reviews": featured_reviews,
            "followed_ratings": followed_ratings,
            "my_rating": my_rating,
        }

        serializer = MatchDetailResponseSerializer(payload)
        return Response(serializer.data)


class MatchRatingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        match = get_object_or_404(Match, pk=pk)

        if Rating.objects.filter(user=request.user, match=match).exists():
            return Response(
                {"detail": "Rating already exists."},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = RatingUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        rating = serializer.save(user=request.user, match=match)

        return Response(
            RatingSerializer(rating).data,
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        rating = get_object_or_404(Rating, user=request.user, match=match)

        serializer = RatingUpsertSerializer(
            rating,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        rating = serializer.save()

        return Response(RatingSerializer(rating).data)
