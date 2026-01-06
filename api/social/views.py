from collections import defaultdict
from datetime import date, datetime, timedelta
import re
import unicodedata
from typing import Optional

from django.contrib.auth import get_user_model
from django.db.models import Avg, Case, Count, Exists, F, FloatField, IntegerField, OuterRef, Prefetch, Q, Sum, Value, When
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
    TeamListSerializer,
)
from .models import Follow, UserFollow
from .serializers import (
    ProfileActivityResponseSerializer,
    ProfileHighlightsResponseSerializer,
    ProfileResponseSerializer,
    ProfileStatsResponseSerializer,
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


class SearchView(APIView):
    permission_classes = [AllowAny]

    # Returns grouped search results for teams, leagues, and matches.
    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        if not q:
            return Response({"detail": "q is required."}, status=status.HTTP_400_BAD_REQUEST)

        raw_types = request.query_params.get("types")
        types = (
            {item.strip() for item in raw_types.split(",") if item.strip()}
            if raw_types
            else {"teams", "leagues", "matches"}
        )

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
                    "results": {"teams": [], "leagues": [], "matches": []},
                }
            )

        results = {"teams": [], "leagues": [], "matches": []}
        total = 0

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

        matches_qs = Match.objects.filter(
            Q(home_team=team) | Q(away_team=team)
        ).select_related(
            "tournament",
            "home_team",
            "away_team",
        )

        now = timezone.now()
        if scope == "recent":
            matches_qs = matches_qs.filter(date_time__lt=now)
        elif scope == "upcoming":
            matches_qs = matches_qs.filter(date_time__gte=now)

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

        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = max(int(request.query_params.get("page_size", 20)), 1)
        except ValueError:
            page_size = 20
        page_size = min(page_size, 50)

        total = matches_qs.count()
        start = (page - 1) * page_size
        end = start + page_size

        serializer = SearchMatchSerializer(matches_qs[start:end], many=True)
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


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    # Returns the current authenticated user.
    def get(self, request):
        return Response(UserMiniSerializer(request.user).data)
