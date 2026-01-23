from __future__ import annotations

from dataclasses import dataclass
from math import sqrt
from typing import Iterable

from django.db.models import Avg, Count, Q
from django.utils import timezone

from matches.models import Match

HISTORY_LIMIT = 10
WEIGHTS = [1.00, 0.95, 0.90, 0.85, 0.80, 0.40, 0.35, 0.30, 0.25, 0.20]
DEFAULT_GLOBAL_MEAN = 60.0


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(value, maximum))


def _weighted_mean(values: Iterable[float]) -> float:
    scores = list(values)
    if not scores:
        return 0.0
    weights = WEIGHTS[: len(scores)]
    weighted_sum = sum(score * weight for score, weight in zip(scores, weights))
    weight_total = sum(weights)
    if not weight_total:
        return 0.0
    return weighted_sum / weight_total


def _std_dev(values: Iterable[float]) -> float:
    scores = list(values)
    if not scores:
        return 0.0
    mean = sum(scores) / len(scores)
    variance = sum((value - mean) ** 2 for value in scores) / len(scores)
    return sqrt(variance)


@dataclass
class TeamHistory:
    scores: list[float]
    mean: float
    std: float


def _team_history(team_id: int, target_match: Match) -> TeamHistory:
    qs = (
        Match.objects.filter(
            Q(home_team_id=team_id) | Q(away_team_id=team_id),
            date_time__lt=target_match.date_time,
        )
        .exclude(pk=target_match.pk)
        .annotate(avg_score=Avg("ratings__score"), rating_count=Count("ratings"))
        .filter(rating_count__gt=0)
        .order_by("-date_time")
    )
    scores = list(qs.values_list("avg_score", flat=True)[:HISTORY_LIMIT])
    mean = _weighted_mean(scores)
    std = _std_dev(scores)
    return TeamHistory(scores=scores, mean=mean, std=std)


def _global_mean() -> float:
    aggregate = (
        Match.objects.annotate(
            avg_score=Avg("ratings__score"), rating_count=Count("ratings")
        )
        .filter(rating_count__gt=0)
        .aggregate(global_mean=Avg("avg_score"))
    )
    return float(aggregate["global_mean"] or DEFAULT_GLOBAL_MEAN)


def compute_watchability(match_id: int) -> dict:
    match = Match.objects.select_related("home_team", "away_team").get(pk=match_id)
    global_mean = _global_mean()

    home_history = _team_history(match.home_team_id, match)
    away_history = _team_history(match.away_team_id, match)

    home_count = len(home_history.scores)
    away_count = len(away_history.scores)

    reliability_home = _clamp((home_count - 2) / 8, 0, 1)
    reliability_away = _clamp((away_count - 2) / 8, 0, 1)

    mu_home_adj = reliability_home * home_history.mean + (
        1 - reliability_home
    ) * global_mean
    mu_away_adj = reliability_away * away_history.mean + (
        1 - reliability_away
    ) * global_mean

    base = (mu_home_adj + mu_away_adj) / 2
    diff = abs(mu_home_adj - mu_away_adj)
    balance_bonus = _clamp(8 - 0.12 * diff, -6, 8)

    watchability = int(round(_clamp(base + balance_bonus, 0, 100)))

    hist_factor = _clamp((min(home_count, away_count) - 3) / 7, 0, 1)
    stability = _clamp(1 - (((home_history.std + away_history.std) / 2) / 18), 0, 1)
    confidence_score = 0.55 * hist_factor + 0.45 * stability

    if confidence_score >= 0.70:
        confidence_label = "High"
    elif confidence_score >= 0.45:
        confidence_label = "Medium"
    else:
        confidence_label = "Low"

    return {
        "watchability": watchability,
        "confidence_label": confidence_label,
        "confidence_score": round(confidence_score, 4),
        "debug": {
            "match_id": match.id,
            "global_mean": round(global_mean, 4),
            "home_scores": [round(score, 4) for score in home_history.scores],
            "away_scores": [round(score, 4) for score in away_history.scores],
            "home_mean": round(home_history.mean, 4),
            "away_mean": round(away_history.mean, 4),
            "home_std": round(home_history.std, 4),
            "away_std": round(away_history.std, 4),
            "home_count": home_count,
            "away_count": away_count,
            "mu_home_adj": round(mu_home_adj, 4),
            "mu_away_adj": round(mu_away_adj, 4),
            "balance_bonus": round(balance_bonus, 4),
            "computed_at": timezone.now().isoformat(),
        },
    }
