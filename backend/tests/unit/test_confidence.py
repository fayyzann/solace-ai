from app.services.rag.confidence import compute_confidence, should_escalate


def test_compute_confidence_empty():
    assert compute_confidence([]) == 0.0


def test_compute_confidence_returns_max():
    assert compute_confidence([0.5, 0.9, 0.7]) == 0.9


def test_escalate_below_threshold():
    assert should_escalate(0.5) is True


def test_no_escalate_above_threshold():
    assert should_escalate(0.9) is False
