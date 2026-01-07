import asyncio
import time
from collections import deque


class AsyncRateLimiter:
    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._lock = asyncio.Lock()
        self._calls = deque()

    async def wait(self) -> None:
        if self.max_calls <= 0 or self.window_seconds <= 0:
            return
        sleep_for = 0
        async with self._lock:
            now = time.monotonic()
            while self._calls and now - self._calls[0] >= self.window_seconds:
                self._calls.popleft()
            if len(self._calls) < self.max_calls:
                self._calls.append(now)
                return
            sleep_for = self.window_seconds - (now - self._calls[0])
        if sleep_for > 0:
            await asyncio.sleep(sleep_for)
        async with self._lock:
            now = time.monotonic()
            while self._calls and now - self._calls[0] >= self.window_seconds:
                self._calls.popleft()
            self._calls.append(now)
