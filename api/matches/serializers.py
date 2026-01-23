from rest_framework import serializers

from core.serializers import UserMiniSerializer
from .models import Match, Rating, Team, Tournament


class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["id", "name", "country", "code", "logo_url"]


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "country", "logo_url"]


class TeamSummarySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "logo_url"]

    def get_logo_url(self, obj):
        return obj.logo_url


class TeamListSerializer(serializers.ModelSerializer):
    is_following = serializers.BooleanField()

    class Meta:
        model = Team
        fields = ["id", "name", "country", "logo_url", "is_following"]


class TeamDetailSerializer(serializers.ModelSerializer):
    city = serializers.SerializerMethodField()
    stadium = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ["id", "name", "country", "city", "stadium", "logo_url", "is_following"]

    def get_city(self, obj):
        return None

    def get_stadium(self, obj):
        return None

    def get_logo_url(self, obj):
        return obj.logo_url

    def get_is_following(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        from social.models import Follow

        return Follow.objects.filter(user=request.user, team=obj).exists()


class LeagueSerializer(serializers.ModelSerializer):
    season = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ["id", "name", "country", "season", "logo_url"]

    def get_season(self, obj):
        return None

    def get_logo_url(self, obj):
        return obj.logo_url


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
            "venue",
            "status",
            "home_score",
            "away_score",
            "watchability_score",
            "watchability_confidence",
            "watchability_updated_at",
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


class RatingMemorySerializer(serializers.ModelSerializer):
    user = UserMiniSerializer(read_only=True)

    class Meta:
        model = Rating
        fields = [
            "id",
            "user",
            "score",
            "minutes_watched",
            "review",
            "attended",
            "stadium_photo_url",
            "representative_photo_url",
            "featured_note",
            "featured_order",
            "featured_primary_image",
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
            "attended",
            "stadium_photo_url",
            "representative_photo_url",
            "featured_note",
            "featured_order",
            "featured_primary_image",
            "created_at",
        ]


class RatingUpsertSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ["score", "minutes_watched", "review"]


class RatingMemoryUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = [
            "attended",
            "stadium_photo_url",
            "representative_photo_url",
            "featured_note",
            "featured_primary_image",
        ]


class FeedMatchSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer(read_only=True)
    home_team = TeamSerializer(read_only=True)
    away_team = TeamSerializer(read_only=True)
    my_rating = serializers.SerializerMethodField()
    avg_score = serializers.SerializerMethodField()
    rating_count = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "tournament",
            "home_team",
            "away_team",
            "date_time",
            "venue",
            "status",
            "home_score",
            "away_score",
            "avg_score",
            "rating_count",
            "my_rating",
            "watchability_score",
            "watchability_confidence",
            "watchability_updated_at",
        ]

    def get_my_rating(self, obj):
        rating_list = getattr(obj, "my_rating_list", [])
        if rating_list:
            return RatingSerializer(rating_list[0]).data
        return None

    def get_avg_score(self, obj):
        weighted_sum = getattr(obj, "weighted_score_sum", None)
        weight_sum = getattr(obj, "weight_sum", None)
        if weighted_sum is not None and weight_sum:
            return round(float(weighted_sum) / float(weight_sum), 2)
        value = getattr(obj, "avg_score", None)
        return float(value or 0)

    def get_rating_count(self, obj):
        value = getattr(obj, "rating_count", None)
        return int(value or 0)


class MatchListSerializer(FeedMatchSerializer):
    pass


class MatchDetailResponseSerializer(serializers.Serializer):
    match = MatchSerializer()
    avg_score = serializers.FloatField()
    rating_count = serializers.IntegerField()
    full_watched_pct = serializers.FloatField()
    featured_reviews = RatingSerializer(many=True)
    followed_ratings = RatingSerializer(many=True)
    my_rating = RatingMemorySerializer(allow_null=True)


class SearchMatchSerializer(serializers.ModelSerializer):
    kickoff_at = serializers.DateTimeField(source="date_time")
    league = LeagueSerializer(source="tournament")
    home = TeamSummarySerializer(source="home_team")
    away = TeamSummarySerializer(source="away_team")
    status = serializers.SerializerMethodField()
    score = serializers.SerializerMethodField()
    avg_rating = serializers.SerializerMethodField()
    my_rating = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = [
            "id",
            "kickoff_at",
            "league",
            "home",
            "away",
            "status",
            "score",
            "avg_rating",
            "my_rating",
        ]

    def get_status(self, obj):
        from django.utils import timezone

        return "upcoming" if obj.date_time >= timezone.now() else "finished"

    def get_score(self, obj):
        return {
            "home": obj.home_score,
            "away": obj.away_score,
        }

    def get_avg_rating(self, obj):
        weighted_sum = getattr(obj, "weighted_score_sum", None)
        weight_sum = getattr(obj, "weight_sum", None)
        if weighted_sum is not None and weight_sum:
            return round(float(weighted_sum) / float(weight_sum), 2)
        value = getattr(obj, "avg_score", None)
        return float(value or 0)

    def get_my_rating(self, obj):
        rating_list = getattr(obj, "my_rating_list", [])
        if rating_list:
            return rating_list[0].score
        return None
