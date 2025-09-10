try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
except Exception:
    HAS_TRANSFORMERS = False


class SentimentAnalyzer:
    def __init__(self):
        if HAS_TRANSFORMERS:
            try:
                self.pipeline = pipeline("sentiment-analysis")
            except Exception:
                self.pipeline = None
        else:
            self.pipeline = None

        # Fallback word lists
        self.pos_words = {"good", "great", "positive", "excellent", "happy", "benefit", "success"}
        self.neg_words = {"bad", "poor", "negative", "terrible", "sad", "harm", "fail", "failure"}

    def analyze(self, text):
        text = text.strip()
        if not text:
            return {"label": "NEUTRAL", "score": 0.0}

        if self.pipeline:
            try:
                out = self.pipeline(text[:512])[0]
                return {"label": out.get("label"), "score": float(out.get("score", 0.0))}
            except Exception:
                pass

        # Heuristic fallback
        t = text.lower()
        pos = sum(t.count(w) for w in self.pos_words)
        neg = sum(t.count(w) for w in self.neg_words)
        if pos > neg:
            return {"label": "POSITIVE", "score": pos / (pos + neg) if (pos + neg) else 0.6}
        elif neg > pos:
            return {"label": "NEGATIVE", "score": neg / (pos + neg) if (pos + neg) else 0.6}
        else:
            return {"label": "NEUTRAL", "score": 0.5}