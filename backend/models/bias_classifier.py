from transformers import pipeline

class BiasClassifier:
    def __init__(self):
        """
        Improved bias classifier for formal/news text.
        Combines a transformer model with heuristic rules.
        """
        try:
            # Model fine-tuned for zero-shot classification
            self.pipe = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli"
            )
        except Exception:
            self.pipe = None

        # Expanded heuristic phrases for bias detection
        self.bias_phrases = {
            "less committed", "avoiding responsibilities", "can't possibly contribute",
            "inferior", "lazy", "weak", "worthless", "not serious",
            "clearly better", "everyone knows", "never contributes",
            "historically", "always", "never", "clearly superior",
            "undeserving", "privileged", "biased", "discriminatory",
            "unfair", "favoring", "prejudice", "stereotype"
        }

    def classify(self, text: str) -> str:
        """
        Classify a single sentence for bias.
        Returns: 'general bias' or 'neutral'
        """
        text = text.strip()
        if not text:
            return "neutral"

        t = text.lower()

        # Heuristic check first (faster)
        if any(p in t for p in self.bias_phrases):
            return "general bias"

        # Model-based zero-shot classification
        if self.pipe:
            try:
                out = self.pipe(
                    text[:512],
                    candidate_labels=["biased", "neutral"]
                )
                label = out.get("labels", ["neutral"])[0].lower()
                score = out.get("scores", [0])[0]
                if label == "biased" and score > 0.55:  # confidence threshold
                    return "general bias"
            except Exception:
                pass

        return "neutral"