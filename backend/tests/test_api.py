import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_analyze_text():
    payload = {"text": "The new policy will help many people but could increase taxes."}
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "analysis" in data
    assert data["sentence_count"] > 0
    first = data["analysis"][0]
    assert "sentence" in first
    assert "sentiment" in first
    assert "bias" in first


def test_missing_input():
    payload = {}
    response = client.post("/analyze", json=payload)
    assert response.status_code == 400
    assert "detail" in response.json()


@pytest.mark.parametrize("text", [
    "Climate change is a catastrophic crisis.",
    "Tax cuts are essential for freedom and growth.",
    "We must fight inequality with progressive policies."
])
def test_bias_and_sentiment_examples(text):
    payload = {"text": text}
    response = client.post("/analyze", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["sentence_count"] >= 1
    for result in data["analysis"]:
        assert "sentence" in result
        assert "sentiment" in result
        assert "bias" in result