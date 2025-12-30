from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.serializers import UserMiniSerializer
from matches.models import Match, Rating, Team
from matches.serializers import FeedMatchSerializer
from .models import Follow, UserFollow
from .serializers import ProfileResponseSerializer

User = get_user_model()


class FeedView(APIView):
    permission_classes = [IsAuthenticated]

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


class TeamFollowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        team = get_object_or_404(Team, pk=pk)
        Follow.objects.get_or_create(user=request.user, team=team)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        Follow.objects.filter(user=request.user, team_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserFollowView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.id == pk:
            return Response(
                {"detail": "Cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target = get_object_or_404(User, pk=pk)
        UserFollow.objects.get_or_create(follower=request.user, following=target)
        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, pk):
        UserFollow.objects.filter(follower=request.user, following_id=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserMiniSerializer(request.user).data)
