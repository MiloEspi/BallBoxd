import logging
import time

from django.conf import settings

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.slow_threshold_seconds = float(
            getattr(settings, "REQUEST_SLOW_LOG_SECONDS", 8)
        )

    def __call__(self, request):
        start = time.perf_counter()
        response = self.get_response(request)
        duration = time.perf_counter() - start
        if duration >= self.slow_threshold_seconds:
            logger.warning(
                "Slow request method=%s path=%s status=%s duration=%.3fs",
                request.method,
                request.get_full_path(),
                getattr(response, "status_code", "-"),
                duration,
            )
        return response
