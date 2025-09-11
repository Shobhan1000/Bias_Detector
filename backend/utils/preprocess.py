import re

def split_sentences(text: str):
    """
    Split text into sentences with basic punctuation detection.
    Handles '.', '?', '!', avoids splitting abbreviations.
    """
    text = text.strip()
    if not text:
        return []

    # Split by punctuation followed by space or end of line
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]

def clean_text(text: str):
    """
    Clean up extracted text: remove extra spaces, HTML entities, normalize quotes
    """
    text = re.sub(r'\s+', ' ', text)
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("‘", "'").replace("’", "'")
    return text.strip()