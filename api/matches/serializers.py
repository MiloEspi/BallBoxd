from rest_framework import serializers

from core.serializers import UserMiniSerializer
from .models import Match, Rating, Team, Tournament


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["id", "name", "country"]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "country"]


class MatchSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "home_team",
            "away_team",
            "date_time",
            "home_score",
            "away_score",
        ]


class RatingSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "user",
            "score",
            "minutes_watched",
            "review",
            "created_at",
        ]


class RatingWithMatchSerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)
    match = MatchSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "user",
            "match",
            "score",
            "minutes_watched",
            "review",
            "created_at",
        ]


class RatingUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ["score", "minutes_watched", "review"]


class FeedMatchSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    my_rating = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "home_team",
            "away_team",
            "date_time",
            "home_score",
            "away_score",
            "my_rating",
        ]

    def get_my_rating(self, obj):
        rating_list = getattr(obj, "my_rating_list", [])
        if rating_list:
            return RatingSerializer(rating_list[0]).data
        return None


class MatchDetailResponseSerializer(serializers.Serializer):
    match = MatchSerializer()
    avg_score = serializers.FloatField()
    rating_count = serializers.IntegerField()
    full_watched_pct = serializers.FloatField()
    featured_reviews = RatingSerializer(many=True)
    followed_ratings = RatingSerializer(many=True)
    my_rating = RatingSerializer(allow_null=True)
