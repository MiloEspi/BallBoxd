from collections import defaultdict
from datetime import timedelta
from typing import Optional

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import UserMiniSerializer
from matches.models import Match, Rating, Team, Tournament
from matches.serializers import FeedMatchSerializer
from .models import Follow, UserFollow
from .serializers import (
    ProfileActivityResponseSerializer,
    ProfileHighlightsResponseSerializer,
    ProfileResponseSerializer,
    ProfileStatsResponseSerializer,
)

User = get_user_model()


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
