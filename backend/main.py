# backend/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline

app = FastAPI()

# Load models (can be cached at startup)
sentiment_model = pipeline("sentiment-analysis")
zero_shot_model = pipeline("zero-shot-classification",
                           model="facebook/bart-large-mnli")

bias_labels = ["neutral", "left-leaning bias", "right-leaning bias", "loaded language"]

class TextInput(BaseModel):
    text: str

@app.post("/analyze")
def analyze_text(input: TextInput):
    sentences = input.text.split(". ")
    results = []

    for sent in sentences:
        sentiment = sentiment_model(sent)[0]

        # classify bias type
        bias = zero_shot_model(sent, candidate_labels=bias_labels)

        results.append({
            "sentence": sent,
            "sentiment": sentiment["label"],
            "sentiment_score": sentiment["score"],
            "bias_label": bias["labels"][0],
            "bias_score": bias["scores"][0]
        })
    
    return {"analysis": results}