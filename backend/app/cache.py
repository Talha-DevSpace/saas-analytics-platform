import redis
import os
from dotenv import load_dotenv

load_dotenv()

redis_client = redis.from_url(
    os.getenv("REDIS_URL", "redis://localhost:6379"),
    decode_responses=True
)


def get_redis():
    return redis_client