from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
import tempfile, os, base64, shutil

from models.sentiment import SentimentAnalyzer
from models.bias_classifier import BiasClassifier
from utils.preprocess import split_sentences, clean_text

app = FastAPI(title="Bias Detector API")

from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:5173",  # your frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # allow frontend origin
    allow_credentials=True,
    allow_methods=["*"],    # allow all HTTP methods
    allow_headers=["*"],    # allow all headers
)

sentiment = SentimentAnalyzer()
bias_clf = BiasClassifier()


class AnalyzeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[HttpUrl] = None
    audio_base64: Optional[str] = None  # base64-encoded audio
    video_url: Optional[HttpUrl] = None


@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    source = None
    extracted_text = ""

    # Direct text
    if req.text:
        source = "text"
        extracted_text = req.text

    # Web URL
    elif req.url:
        source = str(req.url)
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(req.url, timeout=10)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            article = soup.find("article")
            if article:
                extracted_text = " ".join(
                    p.get_text(" ", strip=True) for p in article.find_all("p")
                )
            else:
                extracted_text = " ".join(
                    p.get_text(" ", strip=True) for p in soup.find_all("p")
                )
            extracted_text = clean_text(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    # Audio
    elif req.audio_base64:
        source = "audio"
        tmpdir = tempfile.mkdtemp()
        try:
            b = req.audio_base64
            if b.startswith("data:"):
                b = b.split(",", 1)[1]
            audio_bytes = base64.b64decode(b)
            audio_path = os.path.join(tmpdir, "input_audio.wav")
            with open(audio_path, "wb") as fh:
                fh.write(audio_bytes)

            # Try whisper
            try:
                import whisper

                model = whisper.load_model("small")
                result = model.transcribe(audio_path)
                extracted_text = result.get("text", "")
            except Exception:
                # Fallback: SpeechRecognition
                try:
                    import speech_recognition as sr

                    r = sr.Recognizer()
                    with sr.AudioFile(audio_path) as source_audio:
                        audio = r.record(source_audio)
                    extracted_text = r.recognize_google(audio)
                except Exception as e:
                    raise HTTPException(
                        status_code=400, detail=f"Audio transcription failed: {e}"
                    )

            extracted_text = clean_text(extracted_text)
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    # Video
    elif req.video_url:
        source = str(req.video_url)
        tmpdir = tempfile.mkdtemp()
        try:
            import yt_dlp

            outtmpl = os.path.join(tmpdir, "audio.%(ext)s")
            ydl_opts = {"format": "bestaudio/best", "outtmpl": outtmpl, "quiet": True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(req.video_url, download=True)
            files = os.listdir(tmpdir)
            audio_file = next((os.path.join(tmpdir, f) for f in files if f.startswith("audio.")), None)
            if not audio_file:
                audio_file = os.path.join(tmpdir, files[0])

            try:
                import whisper

                model = whisper.load_model("small")
                result = model.transcribe(audio_file)
                extracted_text = result.get("text", "")
            except Exception:
                raise HTTPException(status_code=400, detail="Could not transcribe video audio.")

            extracted_text = clean_text(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Video processing failed: {e}")
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    else:
        raise HTTPException(status_code=400, detail="No input provided.")

    # Analyze
    sentences = split_sentences(extracted_text)
    results = []
    for s in sentences:
        if not s.strip():
            continue
        sent_sentiment = sentiment.analyze(s)
        sent_bias = bias_clf.classify(s)
        results.append(
            {"sentence": s, "sentiment": sent_sentiment, "bias": sent_bias}
        )

    return {
        "source": source,
        "text_snippet": extracted_text[:300],
        "sentence_count": len(results),
        "analysis": results,
    }