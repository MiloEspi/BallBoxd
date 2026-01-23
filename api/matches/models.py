from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q


class Tournament(models.Model):
    """Competition / League / Tournament."""

    name = models.CharField(max_length=120)
    country = models.CharField(max_length=80, blank=True, default="")
    external_id = models.PositiveIntegerField(null=True, blank=True)
    code = models.CharField(max_length=12, blank=True, default="")
    logo_url = models.URLField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["code"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["name", "country"],
                name="uniq_tournament_name_country",
            ),
            models.UniqueConstraint(
                fields=["external_id"],
                condition=Q(external_id__isnull=False),
                name="uniq_tournament_external_id",
            ),
        ]

    def __str__(self) -> str:
        if self.country:
            return f"{self.name} ({self.country})"
        return self.name


class Team(models.Model):
    name = models.CharField(max_length=120)
    country = models.CharField(max_length=80, blank=True, default="")
    external_id = models.PositiveIntegerField(null=True, blank=True)
    logo_url = models.URLField(blank=True, default="")

    class Meta:
        indexes = [
            models.Index(fields=["external_id"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["external_id"],
                condition=Q(external_id__isnull=False),
                name="uniq_team_external_id",
            ),
        ]

    def __str__(self) -> str:
        return self.name


class Match(models.Model):
    external_id = models.PositiveIntegerField(null=True, blank=True)
    tournament = models.ForeignKey(
        Tournament,
        on_delete=models.PROTECT,
        related_name="matches",
    )
    home_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="home_matches",
    )
    away_team = models.ForeignKey(
        Team,
        on_delete=models.PROTECT,
        related_name="away_matches",
    )
    date_time = models.DateTimeField()
    venue = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=20, blank=True, default="")
    home_score = models.PositiveSmallIntegerField(default=0)
    away_score = models.PositiveSmallIntegerField(default=0)
    watchability_score = models.PositiveSmallIntegerField(null=True, blank=True)
    watchability_confidence = models.CharField(max_length=12, null=True, blank=True)
    watchability_updated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=["external_id"]),
            models.Index(fields=["date_time"]),
            models.Index(fields=["tournament", "date_time"]),
            models.Index(fields=["home_team", "date_time"]),
            models.Index(fields=["away_team", "date_time"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(home_team=F("away_team")),
                name="match_home_team_not_away_team",
            ),
            models.UniqueConstraint(
                fields=["tournament", "date_time", "home_team", "away_team"],
                name="uniq_match_identity",
            ),
            models.UniqueConstraint(
                fields=["external_id"],
                condition=Q(external_id__isnull=False),
                name="uniq_match_external_id",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.home_team} vs {self.away_team} ({self.tournament})"


class Rating(models.Model):
    class MinutesWatched(models.TextChoices):
        LT_30 = "LT_30", "Less than 30'"
        ONE_HALF = "ONE_HALF", "One half"
        ALMOST_ALL = "ALMOST_ALL", "Almost all"
        FULL = "FULL", "Full match"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    match = models.ForeignKey(
        Match,
        on_delete=models.CASCADE,
        related_name="ratings",
    )
    score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    minutes_watched = models.CharField(
        max_length=20,
        choices=MinutesWatched.choices,
    )
    review = models.CharField(max_length=240, blank=True, default="")
    attended = models.BooleanField(default=False)
    stadium_photo_url = models.TextField(blank=True, default="")
    representative_photo_url = models.TextField(blank=True, default="")
    featured_note = models.CharField(max_length=240, blank=True, default="")
    featured_order = models.PositiveSmallIntegerField(null=True, blank=True)
    featured_primary_image = models.CharField(
        max_length=20,
        choices=[
            ("representative", "Representative"),
            ("stadium", "Stadium"),
        ],
        default="representative",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["match", "created_at"]),
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["score"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "match"],
                name="uniq_user_match_rating",
            ),
            models.CheckConstraint(
                condition=Q(score__gte=0) & Q(score__lte=100),
                name="rating_score_0_100",
            ),
            models.UniqueConstraint(
                fields=["user", "featured_order"],
                condition=Q(featured_order__isnull=False),
                name="uniq_user_featured_order",
            ),
            models.CheckConstraint(
                condition=Q(featured_order__isnull=True)
                | (Q(featured_order__gte=1) & Q(featured_order__lte=4)),
                name="rating_featured_order_1_4",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} rated {self.match} = {self.score}"
