from collections import defaultdict
from datetime import date, datetime, timedelta
import re
import unicodedata
from typing import Optional

from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Avg, Case, Count, Exists, F, FloatField, IntegerField, OuterRef, Prefetch, Q, Sum, Value, When
from django.db.models.functions import TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import UserMiniSerializer
from matches.models import Match, Rating, Team, Tournament
from matches.serializers import (
    FeedMatchSerializer,
    LeagueSerializer,
    SearchMatchSerializer,
    TeamDetailSerializer,
    TeamSerializer,
    TeamListSerializer,
)
from .models import Follow, UserFollow
from .serializers import (
    FriendsFeedResponseSerializer,
    ProfileActivityResponseSerializer,
    ProfileHighlightsResponseSerializer,
    ProfileMemoriesResponseSerializer,
    ProfileResponseSerializer,
    ProfileRatedResponseSerializer,
    ProfileStatsResponseSerializer,
    PublicProfileRatingsResponseSerializer,
)

User = get_user_model()


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value.lower())
    stripped = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9\s]+", " ", stripped).strip()


def _tokenize_query(value: str):
    normalized = _normalize_text(value)
    return [token for token in normalized.split() if token]


def _split_vs_query(value: str):
    normalized = _normalize_text(value)
    parts = re.split(r"\s+(?:vs|v|-)\s+", normalized)
    if len(parts) == 2:
        left = [token for token in parts[0].split() if token]
        right = [token for token in parts[1].split() if token]
        if left and right:
            return left, right
    return None


def _minutes_weight_case():
    return Case(
        When(ratings__minutes_watched=Rating.MinutesWatched.LT_30, then=Value(0.25)),
        When(
            ratings__minutes_watched=Rating.MinutesWatched.ONE_HALF, then=Value(0.5)
        ),
        When(
            ratings__minutes_watched=Rating.MinutesWatched.ALMOST_ALL,
            then=Value(0.75),
        ),
        When(ratings__minutes_watched=Rating.MinutesWatched.FULL, then=Value(1.0)),
        default=Value(1.0),
        output_field=FloatField(),
    )


def _rank_by_query(field: str, query: str):
    return Case(
        When(**{f"{field}__iexact": query}, then=Value(0)),
        When(**{f"{field}__istartswith": query}, then=Value(1)),
        default=Value(2),
        output_field=IntegerField(),
    )


class FeedView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns matches from followed teams with the user's rating if present.
    def get(self, request):
        user = request.user
        team_ids = Follow.objects.filter(user=user).values_list("team_id", flat=True)

        matches_qs = Match.objects.filter(
            Q(home_team_id__in=team_ids) | Q(away_team_id__in=team_ids)
        ).select_related(
            "tournament",
            "home_team",
            "away_team",
        ).annotate(
            weighted_score_sum=Sum(F("ratings__score") * _minutes_weight_case()),
            weight_sum=Sum(_minutes_weight_case()),
            rating_count=Count("ratings"),
        ).order_by("-date_time")

        my_ratings = Rating.objects.filter(user=user)
        matches_qs = matches_qs.prefetch_related(
            Prefetch("ratings", queryset=my_ratings, to_attr="my_rating_list")
        )

        serializer = FeedMatchSerializer(matches_qs, many=True)
        data = serializer.data
        return Response(
            {
                "count": len(data),
                "results": data,
            }
        )


class FriendsFeedView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns activity from users the current user follows.
    def get(self, request):
        following_ids = UserFollow.objects.filter(
            follower=request.user
        ).values_list("following_id", flat=True)

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = max(int(request.query_params.get("page_size", 20)), 1)
        except ValueError:
            page_size = 20
        page_size = min(page_size, 50)

        ratings_qs = (
            Rating.objects.filter(user_id__in=following_ids)
            .select_related(
                "user",
                "match",
                "match__tournament",
                "match__home_team",
                "match__away_team",
            )
            .order_by("-created_at")
        )
        total = ratings_qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        results = ratings_qs[start:end]

        payload = {
            "page": page,
            "page_size": page_size,
            "total": total,
            "results": [
                {
                    "actor": rating.user,
                    "match": {
                        "id": rating.match.id,
                        "title": f"{rating.match.home_team} vs {rating.match.away_team}",
                        "date_time": rating.match.date_time,
                        "home_team": rating.match.home_team,
                        "away_team": rating.match.away_team,
                        "tournament": rating.match.tournament.name,
                    },
                    "rating_score": rating.score,
                    "review_snippet": (rating.review or "")[:140],
                    "created_at": rating.created_at,
                }
                for rating in results
            ],
        }
        serializer = FriendsFeedResponseSerializer(payload)
        return Response(serializer.data)


class TeamsView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns the list of teams, marking the ones followed by the user.
    def get(self, request):
        teams_qs = Team.objects.annotate(
            is_following=Exists(
                Follow.objects.filter(user=request.user, team=OuterRef("pk"))
            )
        ).order_by("name")

        serializer = TeamListSerializer(teams_qs, many=True)
        data = serializer.data
        return Response({"count": len(data), "results": data})


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns profile overview with stats and recent activity.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)

        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )

        stats = ratings_qs.aggregate(
            total_ratings=Count("id"),
            avg_score=Avg("score"),
        )
        total_ratings = stats["total_ratings"] or 0
        full_count = ratings_qs.filter(
            minutes_watched=Rating.MinutesWatched.FULL
        ).count()
        fully_watched_pct = (
            round((full_count / total_ratings) * 100, 2) if total_ratings else 0.0
        )

        payload = {
            "user": profile_user,
            "stats": {
                "total_ratings": stats["total_ratings"] or 0,
                "avg_score": float(stats["avg_score"] or 0),
                "teams_followed": Follow.objects.filter(user=profile_user).count(),
                "followers": UserFollow.objects.filter(following=profile_user).count(),
                "following": UserFollow.objects.filter(follower=profile_user).count(),
            },
            "recent_activity": ratings_qs.order_by("-created_at")[:10],
        }

        serializer = ProfileResponseSerializer(payload)
        return Response(serializer.data)


class ProfileTeamsView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns teams followed by the profile user.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        team_ids = Follow.objects.filter(user=profile_user).values_list(
            "team_id", flat=True
        )
        teams_qs = Team.objects.filter(id__in=team_ids).order_by("name")
        serializer = TeamSerializer(teams_qs, many=True)
        return Response({"count": teams_qs.count(), "results": serializer.data})


class PublicProfileView(APIView):
    permission_classes = [AllowAny]

    # Returns public profile with stats and recent ratings list.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)

        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )

        stats = ratings_qs.aggregate(
            total_ratings=Count("id"),
            avg_score=Avg("score"),
        )

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = max(int(request.query_params.get("page_size", 10)), 1)
        except ValueError:
            page_size = 10
        page_size = min(page_size, 50)

        total = ratings_qs.count()
        start = (page - 1) * page_size
        end = start + page_size
        ratings_list = ratings_qs.order_by("-created_at")[start:end]

        is_following = False
        if request.user.is_authenticated:
            is_following = UserFollow.objects.filter(
                follower=request.user, following=profile_user
            ).exists()

        payload = {
            "user": profile_user,
            "is_following": is_following,
            "stats": {
                "total_ratings": total_ratings,
                "avg_score": float(stats["avg_score"] or 0),
                "teams_followed": Follow.objects.filter(user=profile_user).count(),
                "followers": UserFollow.objects.filter(following=profile_user).count(),
                "following": UserFollow.objects.filter(follower=profile_user).count(),
                "fully_watched_pct": fully_watched_pct,
            },
            "page": page,
            "page_size": page_size,
            "total": total,
            "ratings": ratings_list,
        }

        serializer = PublicProfileRatingsResponseSerializer(payload)
        return Response(serializer.data)


# Maps range keys to a datetime lower bound.
def _get_range_start(range_key: Optional[str]):
    if not range_key:
        return None
    ranges = {
        "week": 7,
        "month": 30,
        "year": 365,
    }
    days = ranges.get(range_key)
    if not days:
        return None
    return timezone.now() - timedelta(days=days)


class ProfileStatsView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns aggregated stats for the profile.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        range_key = request.query_params.get("range", "month")
        range_start = _get_range_start(range_key)

        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )
        if range_start:
            ratings_qs = ratings_qs.filter(created_at__gte=range_start)

        ratings = list(ratings_qs)
        total_ratings = len(ratings)
        total_score = sum(rating.score for rating in ratings)
        avg_score = round(total_score / total_ratings, 2) if total_ratings else 0.0
        full_count = sum(
            1
            for rating in ratings
            if rating.minutes_watched == Rating.MinutesWatched.FULL
        )
        fully_watched_pct = (
            round((full_count / total_ratings) * 100, 2) if total_ratings else 0.0
        )

        team_counts = defaultdict(int)
        league_counts = defaultdict(int)
        for rating in ratings:
            match = rating.match
            if not match:
                continue
            if match.home_team_id:
                team_counts[match.home_team_id] += 1
            if match.away_team_id:
                team_counts[match.away_team_id] += 1
            if match.tournament_id:
                league_counts[match.tournament_id] += 1

        total_team_mentions = sum(team_counts.values())
        team_map = {
            team.id: team for team in Team.objects.filter(id__in=team_counts.keys())
        }
        sorted_teams = sorted(team_counts.items(), key=lambda item: item[1], reverse=True)
        max_teams = 5
        top_teams = sorted_teams[:max_teams]
        others_count = sum(count for _, count in sorted_teams[max_teams:])
        team_distribution = []
        for team_id, count in top_teams:
            team = team_map.get(team_id)
            label = team.name if team else "Unknown"
            pct = (
                round((count / total_team_mentions) * 100, 2)
                if total_team_mentions
                else 0.0
            )
            team_distribution.append(
                {
                    "label": label,
                    "team": team,
                    "count": count,
                    "pct": pct,
                }
            )
        if others_count:
            pct = (
                round((others_count / total_team_mentions) * 100, 2)
                if total_team_mentions
                else 0.0
            )
            team_distribution.append(
                {
                    "label": "Others",
                    "team": None,
                    "count": others_count,
                    "pct": pct,
                }
            )

        total_league_mentions = sum(league_counts.values())
        tournament_map = {
            tournament.id: tournament
            for tournament in Tournament.objects.filter(id__in=league_counts.keys())
        }
        sorted_leagues = sorted(
            league_counts.items(), key=lambda item: item[1], reverse=True
        )
        league_top = []
        for tournament_id, count in sorted_leagues[:5]:
            tournament = tournament_map.get(tournament_id)
            if not tournament:
                continue
            pct = (
                round((count / total_league_mentions) * 100, 2)
                if total_league_mentions
                else 0.0
            )
            league_top.append(
                {
                    "tournament": tournament,
                    "count": count,
                    "pct": pct,
                }
            )

        payload = {
            "user": profile_user,
            "range": range_key,
            "stats": {
                "total_ratings": total_ratings,
                "avg_score": avg_score,
                "teams_followed": Follow.objects.filter(user=profile_user).count(),
                "followers": UserFollow.objects.filter(following=profile_user).count(),
                "following": UserFollow.objects.filter(follower=profile_user).count(),
                "fully_watched_pct": fully_watched_pct,
            },
            "team_distribution": team_distribution,
            "league_top": league_top,
        }
        serializer = ProfileStatsResponseSerializer(payload)
        return Response(serializer.data)


class ProfileActivityView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns recent activity with optional time range filtering.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        range_key = request.query_params.get("range", "month")
        range_start = _get_range_start(range_key)

        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )
        if range_start:
            ratings_qs = ratings_qs.filter(created_at__gte=range_start)

        payload = {
            "user": profile_user,
            "range": range_key,
            "results": ratings_qs.order_by("-created_at")[:10],
        }
        serializer = ProfileActivityResponseSerializer(payload)
        return Response(serializer.data)


class ProfileHighlightsView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns top and lowest rated matches for a time range.
    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        range_key = request.query_params.get("range", "month")
        range_start = _get_range_start(range_key)

        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )
        if range_start:
            ratings_qs = ratings_qs.filter(created_at__gte=range_start)

        payload = {
            "user": profile_user,
            "range": range_key,
            "top_rated": ratings_qs.order_by("-score", "-created_at")[:5],
            "low_rated": ratings_qs.order_by("score", "-created_at")[:5],
        }
        serializer = ProfileHighlightsResponseSerializer(payload)
        return Response(serializer.data)


class ProfileMemoriesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        ratings_qs = (
            Rating.objects.filter(user=profile_user, featured_order__isnull=False)
            .select_related(
                "match",
                "match__tournament",
                "match__home_team",
                "match__away_team",
            )
            .order_by("featured_order")
        )

        payload = {
            "user": profile_user,
            "max_count": 4,
            "results": ratings_qs,
        }
        serializer = ProfileMemoriesResponseSerializer(payload)
        return Response(serializer.data)

    def post(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        if request.user != profile_user:
            return Response(
                {"detail": "You cannot edit this profile."},
                status=status.HTTP_403_FORBIDDEN,
            )

        match_id = request.data.get("match_id")
        replace_match_id = request.data.get("replace_match_id")
        if not match_id or not str(match_id).isdigit():
            return Response(
                {"detail": "match_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rating = Rating.objects.filter(
            user=profile_user, match_id=int(match_id)
        ).first()
        if not rating:
            return Response(
                {"detail": "You need to rate this match first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if rating.featured_order is not None:
            return self.get(request, username)

        featured_qs = Rating.objects.filter(
            user=profile_user, featured_order__isnull=False
        )
        featured_count = featured_qs.count()

        if featured_count >= 4 and not replace_match_id:
            current_ids = list(
                featured_qs.order_by("featured_order").values_list("match_id", flat=True)
            )
            return Response(
                {
                    "detail": "Featured list is full.",
                    "current": current_ids,
                },
                status=status.HTTP_409_CONFLICT,
            )

        replace_rating = None
        if replace_match_id:
            if not str(replace_match_id).isdigit():
                return Response(
                    {"detail": "replace_match_id must be numeric."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            replace_rating = featured_qs.filter(
                match_id=int(replace_match_id)
            ).first()
            if not replace_rating:
                return Response(
                    {"detail": "replace_match_id is not featured."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        with transaction.atomic():
            if replace_rating:
                target_order = replace_rating.featured_order
                replace_rating.featured_order = None
                replace_rating.save(update_fields=["featured_order"])
            else:
                taken = set(
                    featured_qs.values_list("featured_order", flat=True)
                )
                target_order = next(
                    (value for value in range(1, 5) if value not in taken), 1
                )
            rating.featured_order = target_order
            rating.save(update_fields=["featured_order"])

        return self.get(request, username)

    def patch(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        if request.user != profile_user:
            return Response(
                {"detail": "You cannot edit this profile."},
                status=status.HTTP_403_FORBIDDEN,
            )

        order_list = request.data.get("order")
        match_id = request.data.get("match_id")
        if isinstance(order_list, list):
            cleaned = [item for item in order_list if str(item).isdigit()]
            if len(cleaned) != len(order_list):
                return Response(
                    {"detail": "Order list must contain numeric match ids."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            match_ids = [int(item) for item in cleaned]
            featured_qs = Rating.objects.filter(
                user=profile_user, featured_order__isnull=False
            )
            current_ids = list(
                featured_qs.values_list("match_id", flat=True)
            )
            if len(set(match_ids)) != len(match_ids):
                return Response(
                    {"detail": "Order list contains duplicates."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if sorted(match_ids) != sorted(current_ids):
                return Response(
                    {"detail": "Order list must match featured matches."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            with transaction.atomic():
                featured_qs.update(featured_order=None)
                for index, item in enumerate(match_ids, start=1):
                    Rating.objects.filter(
                        user=profile_user, match_id=item
                    ).update(featured_order=index)
            return self.get(request, username)

        if match_id and str(match_id).isdigit():
            rating = Rating.objects.filter(
                user=profile_user, match_id=int(match_id)
            ).first()
            if not rating or rating.featured_order is None:
                return Response(
                    {"detail": "Match is not featured."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if "featured_note" in request.data:
                note = request.data.get("featured_note")
                if note is None:
                    note = ""
                if not isinstance(note, str):
                    return Response(
                        {"detail": "featured_note must be a string."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if len(note) > 240:
                    return Response(
                        {"detail": "featured_note is too long."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                rating.featured_note = note
            if "representative_photo_url" in request.data:
                rep_url = request.data.get("representative_photo_url")
                if rep_url is None:
                    rep_url = ""
                if not isinstance(rep_url, str):
                    return Response(
                        {"detail": "representative_photo_url must be a string."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                rating.representative_photo_url = rep_url
            if "featured_primary_image" in request.data:
                primary = request.data.get("featured_primary_image")
                if primary not in {"representative", "stadium"}:
                    return Response(
                        {"detail": "featured_primary_image is invalid."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                rating.featured_primary_image = primary
            if (
                rating.featured_primary_image == "stadium"
                and not rating.stadium_photo_url
            ):
                rating.featured_primary_image = "representative"
            rating.save()
            return self.get(request, username)

        return Response(
            {"detail": "No valid update payload provided."},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ProfileMemoryDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, username, match_id):
        profile_user = get_object_or_404(User, username=username)
        if request.user != profile_user:
            return Response(
                {"detail": "You cannot edit this profile."},
                status=status.HTTP_403_FORBIDDEN,
            )
        Rating.objects.filter(
            user=profile_user, match_id=match_id
        ).update(featured_order=None)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProfileRatedMatchesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, username):
        profile_user = get_object_or_404(User, username=username)
        if request.user != profile_user:
            return Response(
                {"detail": "You cannot access these ratings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        query = (request.query_params.get("q") or "").strip()
        ratings_qs = Rating.objects.filter(user=profile_user).select_related(
            "match",
            "match__tournament",
            "match__home_team",
            "match__away_team",
        )
        if query:
            ratings_qs = ratings_qs.filter(
                Q(match__home_team__name__icontains=query)
                | Q(match__away_team__name__icontains=query)
                | Q(match__tournament__name__icontains=query)
            )

        payload = {
            "user": profile_user,
            "results": ratings_qs.order_by("-created_at")[:50],
        }
        serializer = ProfileRatedResponseSerializer(payload)
        return Response(serializer.data)


class SearchView(APIView):
    permission_classes = [AllowAny]

    # Returns grouped search results for teams, leagues, and matches.
    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"detail": "q is required."}, status=status.HTTP_400_BAD_REQUEST)

        raw_types = request.query_params.get("types")
        if raw_types:
            types = {item.strip() for item in raw_types.split(",") if item.strip()}
            if "all" in types:
                types = {"users", "teams", "leagues", "matches"}
        else:
            types = {"users", "teams", "leagues", "matches"}

        league_id = request.query_params.get("league_id")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = max(int(request.query_params.get("page_size", 20)), 1)
        except ValueError:
            page_size = 20
        page_size = min(page_size, 50)

        tokens = _tokenize_query(q)
        vs_tokens = _split_vs_query(q)

        if not tokens and not vs_tokens:
            return Response(
                {
                    "q": q,
                    "page": page,
                    "page_size": page_size,
                    "total": 0,
                    "results": {
                        "users": [],
                        "teams": [],
                        "leagues": [],
                        "matches": [],
                    },
                }
            )

        results = {"users": [], "teams": [], "leagues": [], "matches": []}
        total = 0

        if "users" in types:
            users_qs = User.objects.all()
            for token in tokens:
                users_qs = users_qs.filter(username__icontains=token)
            users_qs = users_qs.annotate(rank=_rank_by_query("username", q)).order_by(
                "rank", "username"
            )
            total += users_qs.count()
            start = (page - 1) * page_size
            end = start + page_size
            results["users"] = UserMiniSerializer(
                users_qs[start:end], many=True
            ).data

        if "teams" in types:
            teams_qs = Team.objects.all()
            for token in tokens:
                teams_qs = teams_qs.filter(name__icontains=token)
            if league_id and str(league_id).isdigit():
                teams_qs = teams_qs.filter(
                    Q(home_matches__tournament_id=int(league_id))
                    | Q(away_matches__tournament_id=int(league_id))
                ).distinct()
            teams_qs = teams_qs.annotate(rank=_rank_by_query("name", q)).order_by(
                "rank", "name"
            )
            total += teams_qs.count()
            start = (page - 1) * page_size
            end = start + page_size
            results["teams"] = TeamDetailSerializer(teams_qs[start:end], many=True).data

        if "leagues" in types:
            leagues_qs = Tournament.objects.all()
            for token in tokens:
                leagues_qs = leagues_qs.filter(
                    Q(name__icontains=token) | Q(country__icontains=token)
                )
            leagues_qs = leagues_qs.annotate(rank=_rank_by_query("name", q)).order_by(
                "rank", "name"
            )
            total += leagues_qs.count()
            start = (page - 1) * page_size
            end = start + page_size
            results["leagues"] = LeagueSerializer(leagues_qs[start:end], many=True).data

        if "matches" in types:
            matches_qs = Match.objects.select_related(
                "tournament",
                "home_team",
                "away_team",
            )
            if league_id and str(league_id).isdigit():
                matches_qs = matches_qs.filter(tournament_id=int(league_id))

            parsed_from = (
                parse_datetime(date_from) or parse_date(date_from)
                if date_from
                else None
            )
            parsed_to = (
                parse_datetime(date_to) or parse_date(date_to) if date_to else None
            )
            if parsed_from:
                if isinstance(parsed_from, date) and not isinstance(
                    parsed_from, datetime
                ):
                    matches_qs = matches_qs.filter(date_time__date__gte=parsed_from)
                else:
                    matches_qs = matches_qs.filter(date_time__gte=parsed_from)
            if parsed_to:
                if isinstance(parsed_to, date) and not isinstance(parsed_to, datetime):
                    matches_qs = matches_qs.filter(date_time__date__lte=parsed_to)
                else:
                    matches_qs = matches_qs.filter(date_time__lte=parsed_to)

            if vs_tokens:
                left_tokens, right_tokens = vs_tokens

                def team_filter(prefix, items):
                    query = Q()
                    for token in items:
                        query &= Q(**{f"{prefix}__name__icontains": token})
                    return query

                matches_qs = matches_qs.filter(
                    (
                        team_filter("home_team", left_tokens)
                        & team_filter("away_team", right_tokens)
                    )
                    | (
                        team_filter("home_team", right_tokens)
                        & team_filter("away_team", left_tokens)
                    )
                )
            else:
                for token in tokens:
                    matches_qs = matches_qs.filter(
                        Q(home_team__name__icontains=token)
                        | Q(away_team__name__icontains=token)
                    )

            matches_qs = matches_qs.annotate(
                weighted_score_sum=Sum(F("ratings__score") * _minutes_weight_case()),
                weight_sum=Sum(_minutes_weight_case()),
                rating_count=Count("ratings"),
            ).order_by("-date_time")

            if request.user.is_authenticated:
                my_ratings = Rating.objects.filter(user=request.user)
                matches_qs = matches_qs.prefetch_related(
                    Prefetch("ratings", queryset=my_ratings, to_attr="my_rating_list")
                )

            total += matches_qs.count()
            start = (page - 1) * page_size
            end = start + page_size
            results["matches"] = SearchMatchSerializer(
                matches_qs[start:end], many=True
            ).data

        return Response(
            {
                "q": q,
                "page": page,
                "page_size": page_size,
                "total": total,
                "results": results,
            }
        )


class TeamDetailView(APIView):
    permission_classes = [AllowAny]

    # Returns team details.
    def get(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        return Response(TeamDetailSerializer(team, context={"request": request}).data)


class TeamMatchesView(APIView):
    permission_classes = [AllowAny]

    # Returns team matches with optional scope filtering.
    def get(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        scope = request.query_params.get("scope", "all")

        base_qs = Match.objects.filter(
            Q(home_team=team) | Q(away_team=team)
        ).select_related(
            "tournament",
            "home_team",
            "away_team",
        ).annotate(
            weighted_score_sum=Sum(F("ratings__score") * _minutes_weight_case()),
            weight_sum=Sum(_minutes_weight_case()),
            rating_count=Count("ratings"),
            match_day=TruncDate("date_time"),
        )

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = max(int(request.query_params.get("page_size", 20)), 1)
        except ValueError:
            page_size = 20
        page_size = min(page_size, 50)

        now = timezone.now()
        start = (page - 1) * page_size
        end = start + page_size

        if request.user.is_authenticated:
            my_ratings = Rating.objects.filter(user=request.user)
            base_qs = base_qs.prefetch_related(
                Prefetch("ratings", queryset=my_ratings, to_attr="my_rating_list")
            )

        def recent_ordered(qs):
            return qs.order_by("-match_day", "date_time")

        def upcoming_ordered(qs):
            return qs.order_by("date_time")

        if scope == "upcoming":
            matches_qs = upcoming_ordered(base_qs.filter(date_time__gte=now))
            total = matches_qs.count()
            results = list(matches_qs[start:end])
        elif scope == "recent":
            matches_qs = recent_ordered(base_qs.filter(date_time__lt=now))
            total = matches_qs.count()
            results = list(matches_qs[start:end])
        else:
            upcoming_qs = upcoming_ordered(base_qs.filter(date_time__gte=now))
            past_qs = recent_ordered(base_qs.filter(date_time__lt=now))
            upcoming_count = upcoming_qs.count()
            past_count = past_qs.count()
            total = upcoming_count + past_count

            results = []
            if start < upcoming_count:
                upcoming_end = min(end, upcoming_count)
                results.extend(list(upcoming_qs[start:upcoming_end]))

            if end > upcoming_count:
                past_start = max(0, start - upcoming_count)
                past_end = max(0, end - upcoming_count)
                results.extend(list(past_qs[past_start:past_end]))

        serializer = FeedMatchSerializer(results, many=True)
        return Response(
            {
                "page": page,
                "page_size": page_size,
                "total": total,
                "results": serializer.data,
            }
        )


class TeamFollowView(APIView):
    permission_classes = [IsAuthenticated]

    # Follows a team for the current user.
    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        Follow.objects.get_or_create(user=request.user, team=team)
        return Response(status=status.HTTP_201_CREATED)

    # Unfollows a team for the current user.
    def delete(self, request, pk):
        Follow.objects.filter(user=request.user, team_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserFollowView(APIView):
    permission_classes = [IsAuthenticated]

    # Follows another user.
    def post(self, request, pk):
        if request.user.id == pk:
            return Response(
                {"detail": "Cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = get_object_or_404(User, pk=pk)
        UserFollow.objects.get_or_create(follower=request.user, following=target)
        return Response(status=status.HTTP_201_CREATED)

    # Unfollows another user.
    def delete(self, request, pk):
        UserFollow.objects.filter(follower=request.user, following_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserFollowByUsernameView(APIView):
    permission_classes = [IsAuthenticated]

    # Follows another user by username.
    def post(self, request, username):
        target = get_object_or_404(User, username=username)
        if request.user == target:
            return Response(
                {"detail": "Cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        UserFollow.objects.get_or_create(follower=request.user, following=target)
        return Response(
            {
                "is_following": True,
                "followers": UserFollow.objects.filter(following=target).count(),
                "following": UserFollow.objects.filter(follower=target).count(),
            },
            status=status.HTTP_200_OK,
        )

    # Unfollows another user by username.
    def delete(self, request, username):
        target = get_object_or_404(User, username=username)
        if request.user == target:
            return Response(
                {"detail": "Cannot unfollow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        UserFollow.objects.filter(follower=request.user, following=target).delete()
        return Response(
            {
                "is_following": False,
                "followers": UserFollow.objects.filter(following=target).count(),
                "following": UserFollow.objects.filter(follower=target).count(),
            },
            status=status.HTTP_200_OK,
        )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns the current authenticated user.
    def get(self, request):
        return Response(UserMiniSerializer(request.user).data)
