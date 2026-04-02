from collections import defaultdict, deque
from time import time
from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self.storage: dict[str, deque[float]] = defaultdict(deque)

    def hit(self, key: str, limit: int, window_seconds: int) -> None:
        now = time()
        queue = self.storage[key]
        while queue and queue[0] <= now - window_seconds:
            queue.popleft()
        if len(queue) >= limit:
            raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail='Muitas tentativas. Aguarde.')
        queue.append(now)


limiter = InMemoryRateLimiter()


def rate_limit(limit: int, window_seconds: int):
    async def dependency(request: Request):
        client_ip = request.client.host if request.client else 'unknown'
        key = f'{request.url.path}:{client_ip}'
        limiter.hit(key, limit, window_seconds)
    return dependency
