import logging
import sys
from app.config import get_settings

settings = get_settings()


def setup_logging() -> None:
    log_level = getattr(logging, settings.log_level.upper(), logging.INFO)
    fmt = "%(asctime)s %(levelname)s %(name)s %(message)s" if settings.is_production else "%(levelname)s %(name)s: %(message)s"

    logging.basicConfig(
        level=log_level,
        format=fmt,
        stream=sys.stdout,
    )
    # Silence noisy libraries
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
