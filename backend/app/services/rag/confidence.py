from app.config import get_settings

settings = get_settings()


def compute_confidence(scores: list[float]) -> float:
    if not scores:
        return 0.0
    return round(max(scores), 4)


def should_escalate(confidence: float) -> bool:
    return confidence < settings.confidence_threshold
