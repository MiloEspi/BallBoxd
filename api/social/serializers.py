from rest_framework import serializers

from core.serializers import UserMiniSerializer
from matches.serializers import (
    RatingWithMatchSerializer,
    TeamSerializer,
    TeamSummarySerializer,
    TournamentSerializer,
)


class ProfileStatsSerializer(serializers.Serializer):
    total_ratings = serializers.IntegerField()
    avg_score = serializers.FloatField()
    teams_followed = serializers.IntegerField()
    followers = serializers.IntegerField()
    following = serializers.IntegerField()
    fully_watched_pct = serializers.FloatField()


class TeamDistributionSerializer(serializers.Serializer):
    label = serializers.CharField()
    team = TeamSerializer(allow_null=True, required=False)
    count = serializers.IntegerField()
    pct = serializers.FloatField()


class LeagueRankingSerializer(serializers.Serializer):
    tournament = TournamentSerializer()
    count = serializers.IntegerField()
    pct = serializers.FloatField()


class ProfileStatsResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    range = serializers.CharField()
    stats = ProfileStatsSerializer()
    team_distribution = TeamDistributionSerializer(many=True)
    league_top = LeagueRankingSerializer(many=True)


class ProfileActivityResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    range = serializers.CharField()
    results = RatingWithMatchSerializer(many=True)


class ProfileHighlightsResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    range = serializers.CharField()
    top_rated = RatingWithMatchSerializer(many=True)
    low_rated = RatingWithMatchSerializer(many=True)


class ProfileMemoriesResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    max_count = serializers.IntegerField()
    results = RatingWithMatchSerializer(many=True)


class ProfileRatedResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    results = RatingWithMatchSerializer(many=True)


class ProfileResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    stats = ProfileStatsSerializer()
    recent_activity = RatingWithMatchSerializer(many=True)


class FriendFeedMatchSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    title = serializers.CharField()
    date_time = serializers.DateTimeField()
    home_team = TeamSummarySerializer()
    away_team = TeamSummarySerializer()
    tournament = serializers.CharField()


class FriendsFeedItemSerializer(serializers.Serializer):
    actor = UserMiniSerializer()
    match = FriendFeedMatchSerializer()
    rating_score = serializers.IntegerField()
    review_snippet = serializers.CharField(allow_blank=True)
    created_at = serializers.DateTimeField()


class FriendsFeedResponseSerializer(serializers.Serializer):
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total = serializers.IntegerField()
    results = FriendsFeedItemSerializer(many=True)


class PublicProfileRatingsResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    is_following = serializers.BooleanField()
    stats = ProfileStatsSerializer()
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total = serializers.IntegerField()
    ratings = RatingWithMatchSerializer(many=True)
