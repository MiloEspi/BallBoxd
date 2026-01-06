from django.db.models import Case, Count, F, FloatField, Prefetch, Q, Sum, Value, When
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from social.models import UserFollow
from .models import Match, Rating
from .serializers import (
    MatchListSerializer,
    MatchDetailResponseSerializer,
    RatingMemorySerializer,
    RatingMemoryUpdateSerializer,
    RatingSerializer,
    RatingUpsertSerializer,
)


def _minutes_weight_case(prefix: str = "ratings__"):
    field = f"{prefix}minutes_watched"
    return Case(
        When(**{field: Rating.MinutesWatched.LT_30}, then=Value(0.25)),
        When(**{field: Rating.MinutesWatched.ONE_HALF}, then=Value(0.5)),
        When(**{field: Rating.MinutesWatched.ALMOST_ALL}, then=Value(0.75)),
        When(**{field: Rating.MinutesWatched.FULL}, then=Value(1.0)),
        default=Value(1.0),
        output_field=FloatField(),
    )


def _weighted_avg_score(ratings):
    weights = {
        Rating.MinutesWatched.LT_30: 0.25,
        Rating.MinutesWatched.ONE_HALF: 0.5,
        Rating.MinutesWatched.ALMOST_ALL: 0.75,
        Rating.MinutesWatched.FULL: 1.0,
    }
    weighted_sum = 0.0
    weight_total = 0.0
    for rating in ratings:
        weight = weights.get(rating.minutes_watched, 1.0)
        weighted_sum += rating.score * weight
        weight_total += weight
    if not weight_total:
        return 0.0
    return round(weighted_sum / weight_total, 2)


class MatchListView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns a catalog of matches with optional filters.
    def get(self, request):
        date_param = request.query_params.get("date")
        from_param = request.query_params.get("from")
        to_param = request.query_params.get("to")
        tournament_param = request.query_params.get("tournament")
        search_param = request.query_params.get("search")

        matches_qs = Match.objects.select_related(
            "tournament",
            "home_team",
            "away_team",
        )

        if date_param:
            parsed_date = parse_date(date_param) or (
                parse_datetime(date_param).date()
                if parse_datetime(date_param)
                else None
            )
            if parsed_date:
                matches_qs = matches_qs.filter(date_time__date=parsed_date)

        if from_param:
            parsed_from = parse_datetime(from_param) or parse_date(from_param)
            if parsed_from:
                matches_qs = matches_qs.filter(date_time__gte=parsed_from)

        if to_param:
            parsed_to = parse_datetime(to_param) or parse_date(to_param)
            if parsed_to:
                matches_qs = matches_qs.filter(date_time__lte=parsed_to)

        if tournament_param:
            trimmed = tournament_param.strip()
            if trimmed.isdigit():
                matches_qs = matches_qs.filter(tournament_id=int(trimmed))
            else:
                matches_qs = matches_qs.filter(
                    tournament__name__iexact=trimmed
                )

        if search_param:
            trimmed = search_param.strip()
            if trimmed:
                matches_qs = matches_qs.filter(
                    Q(home_team__name__icontains=trimmed)
                    | Q(away_team__name__icontains=trimmed)
                    | Q(tournament__name__icontains=trimmed)
                )

        weight_case = _minutes_weight_case()
        matches_qs = matches_qs.annotate(
            weighted_score_sum=Sum(F("ratings__score") * weight_case),
            weight_sum=Sum(weight_case),
            rating_count=Count("ratings"),
        ).order_by("-date_time")

        my_ratings = Rating.objects.filter(user=request.user)
        matches_qs = matches_qs.prefetch_related(
            Prefetch("ratings", queryset=my_ratings, to_attr="my_rating_list")
        )

        serializer = MatchListSerializer(matches_qs, many=True)
        data = serializer.data
        return Response({"count": len(data), "results": data})


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
        rating_count = ratings_qs.count()
        avg_score = _weighted_avg_score(ratings_qs)

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


class MatchMemoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        rating = get_object_or_404(Rating, user=request.user, match=match)
        return Response(RatingMemorySerializer(rating).data)

    def patch(self, request, pk):
        match = get_object_or_404(Match, pk=pk)
        rating = get_object_or_404(Rating, user=request.user, match=match)

        serializer = RatingMemoryUpdateSerializer(
            rating,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        rating = serializer.save()

        if rating.featured_primary_image == "stadium" and not rating.stadium_photo_url:
            rating.featured_primary_image = "representative"
            rating.save(update_fields=["featured_primary_image"])

        return Response(RatingMemorySerializer(rating).data)
