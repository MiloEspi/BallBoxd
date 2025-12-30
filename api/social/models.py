from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Follow(models.Model):
    """User follows Team (for feed and fan-side)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="team_follows",
    )
    team = models.ForeignKey(
        "matches.Team",
        on_delete=models.CASCADE,
        related_name="followers",
    )
    follow_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "team"],
                name="uniq_user_team_follow",
            )
        ]

    def __str__(self) -> str:
        return f"{self.user} -> {self.team}"


class UserFollow(models.Model):
    """User follows User (friends = mutual follow)."""

    follower = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following_users",
    )
    following = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="follower_users",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "following"],
                name="uniq_user_user_follow",
            ),
            models.CheckConstraint(
                condition=~Q(follower=F("following")),
                name="userfollow_not_self",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.follower} -> {self.following}"
