from rest_framework import serializers

from core.serializers import UserMiniSerializer
from matches.serializers import RatingWithMatchSerializer


class ProfileStatsSerializer(serializers.Serializer):
    total_ratings = serializers.IntegerField()
    avg_score = serializers.FloatField()
    teams_followed = serializers.IntegerField()
    followers = serializers.IntegerField()
    following = serializers.IntegerField()


class ProfileResponseSerializer(serializers.Serializer):
    user = UserMiniSerializer()
    stats = ProfileStatsSerializer()
    recent_activity = RatingWithMatchSerializer(many=True)
