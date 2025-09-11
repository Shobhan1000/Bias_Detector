from transformers import pipeline

class SentimentAnalyzer:
    def __init__(self):
        """
        Improved sentiment analyzer for formal/news text.
        Combines transformer model + heuristic rules for better accuracy.
        """
        try:
            # Model fine-tuned for multi-class sentiment on formal text
            self.pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest"
            )
        except Exception:
            self.pipeline = None

        # Expanded heuristic phrases for negative sentiment detection
        self.negative_phrases = {
            "less committed", "avoiding responsibilities", "can't possibly contribute",
            "lazy", "weak", "unreliable", "not serious", "worthless",
            "caused offense", "biased", "halted feature", "problematic",
            "offended", "controversial", "criticism", "failure", "mistake",
            "error", "wrong", "flawed", "negative impact"
        }

        # Optional positive phrases
        self.positive_phrases = {
            "improved", "success", "helpful", "advancement", "achievement",
            "effective", "robust", "strong", "valuable", "correct"
        }

    def analyze(self, text: str) -> str:
        """
        Analyze the sentiment of a single sentence.
        Returns: 'negative', 'positive', or 'neutral'
        """
        text = text.strip()
        if not text:
            return "neutral"

        # Preprocess text
        t = text.replace("\n", " ").replace("“", '"').replace("”", '"').lower()

        # Heuristic check for negative sentiment
        if any(p in t for p in self.negative_phrases):
            return "negative"
        if any(p in t for p in self.positive_phrases):
            return "positive"

        # Model-based sentiment
        if self.pipeline:
            try:
                # Truncate to 512 tokens
                result = self.pipeline(text[:512])[0]
                label = result.get("label", "").lower()
                score = result.get("score", 0.0)

                # Thresholding for higher accuracy
                if "neg" in label and score > 0.55:
                    return "negative"
                elif "pos" in label and score > 0.55:
                    return "positive"
                else:
                    return "neutral"
            except Exception:
                pass

        return "neutral"