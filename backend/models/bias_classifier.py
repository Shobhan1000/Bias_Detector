try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
except Exception:
    HAS_TRANSFORMERS = False


class BiasClassifier:
    def __init__(self):
        self.labels = ["neutral", "left-leaning bias", "right-leaning bias", "loaded language"]
        if HAS_TRANSFORMERS:
            try:
                self.pipe = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
            except Exception:
                self.pipe = None
        else:
            self.pipe = None

        # Fallback keywords
        self.left_words = {"progressive", "social justice", "climate crisis", "inequality", "regressive"}
        self.right_words = {"freedom", "tax cuts", "border", "illegal immigrants", "traditional"}
        self.loaded_words = {"disaster", "crisis", "catastrophic", "radical", "extremist"}

    def classify(self, text):
        text = text.strip()
        if not text:
            return {"label": "neutral", "score": 0.0}

        if self.pipe:
            try:
                out = self.pipe(text[:512], candidate_labels=self.labels)
                return {"label": out["labels"][0], "scores": [float(x) for x in out["scores"]]}
            except Exception:
                pass

        # Heuristic fallback
        t = text.lower()
        l = sum(t.count(w) for w in self.left_words)
        r = sum(t.count(w) for w in self.right_words)
        loaded = sum(t.count(w) for w in self.loaded_words)

        if loaded > 0:
            return {"label": "loaded language", "score": float(loaded)}
        if l > r:
            return {"label": "left-leaning bias", "score": float(l)}
        if r > l:
            return {"label": "right-leaning bias", "score": float(r)}
        return {"label": "neutral", "score": 0.0}