from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl
from typing import Optional
import tempfile, os, base64, shutil, pathlib, logging, subprocess

from models.sentiment import SentimentAnalyzer
from models.bias_classifier import BiasClassifier
from utils.preprocess import split_sentences, clean_text

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logging.basicConfig(level=logging.INFO)

# ---------------------- App Setup ----------------------
app = FastAPI(title="Bias Detector API")

HERE = pathlib.Path(__file__).parent
dist_dir = HERE.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
else:
    print(f"⚠️ No frontend build found at {dist_dir}")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load analyzers
sentiment = SentimentAnalyzer()
bias_clf = BiasClassifier()

# ---------------------- Request Model ----------------------
class AnalyzeRequest(BaseModel):
    text: Optional[str] = None
    url: Optional[HttpUrl] = None
    audio_base64: Optional[str] = None
    video_url: Optional[HttpUrl] = None

# ---------------------- Helpers ----------------------
def convert_to_wav(input_file: str, output_file: str) -> str:
    """Convert any audio to WAV 16kHz mono for SpeechRecognition"""
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_file, "-ar", "16000", "-ac", "1", output_file],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return output_file
    except Exception as e:
        raise RuntimeError(f"ffmpeg conversion failed: {e}")

def transcribe_audio_file(audio_path: str) -> str:
    """Transcribe audio using Whisper first, fallback to SpeechRecognition with WAV conversion"""
    # Try Whisper
    try:
        import whisper
        model = whisper.load_model("tiny")
        result = model.transcribe(audio_path)
        text = result.get("text", "")
        if text.strip():
            return text
    except Exception as e:
        logging.warning(f"Whisper failed: {e}")

    # Convert to WAV for SpeechRecognition
    tmp_wav = audio_path + "_converted.wav"
    convert_to_wav(audio_path, tmp_wav)

    # SpeechRecognition fallback
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(tmp_wav) as source_audio:
            audio = r.record(source_audio)
        text = r.recognize_google(audio)
        return text
    except Exception as e:
        logging.error(f"SpeechRecognition failed: {e}")
        raise HTTPException(status_code=400, detail=f"Audio transcription failed: {e}")
    finally:
        if os.path.exists(tmp_wav):
            os.remove(tmp_wav)

# ---------------------- Analyze Route ----------------------
@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    source = None
    extracted_text = ""

    # ---------- Text ----------
    if req.text:
        source = "text"
        extracted_text = req.text

    # ---------- URL ----------
    elif req.url:
        source = str(req.url)
        try:
            import requests
            from bs4 import BeautifulSoup
            r = requests.get(source, timeout=10)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            article = soup.find("article")
            if article:
                extracted_text = " ".join(p.get_text(" ", strip=True) for p in article.find_all("p"))
            else:
                extracted_text = " ".join(p.get_text(" ", strip=True) for p in soup.find_all("p"))
            extracted_text = clean_text(extracted_text)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    # ---------- Audio ----------
    elif req.audio_base64:
        source = "audio"
        tmpdir = tempfile.mkdtemp()
        try:
            b = req.audio_base64
            if b.startswith("data:"):
                b = b.split(",", 1)[1]
            audio_bytes = base64.b64decode(b)
            audio_path = os.path.join(tmpdir, "input_audio")
            with open(audio_path, "wb") as fh:
                fh.write(audio_bytes)
            extracted_text = clean_text(transcribe_audio_file(audio_path))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    # ---------- Video ----------
    elif req.video_url:
        source = str(req.video_url)
        tmpdir = tempfile.mkdtemp()
        try:
            import yt_dlp
            outtmpl = os.path.join(tmpdir, "audio.%(ext)s")
            ydl_opts = {"format": "bestaudio/best", "outtmpl": outtmpl, "quiet": True}
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.extract_info(source, download=True)

            files = os.listdir(tmpdir)
            logging.info(f"Downloaded files: {files}")
            audio_file = next((os.path.join(tmpdir, f) for f in files if f.startswith("audio.")), None)
            if not audio_file:
                raise HTTPException(status_code=400, detail="No audio file extracted from video")
            if os.path.getsize(audio_file) == 0:
                raise HTTPException(status_code=400, detail="Extracted audio file is empty")

            extracted_text = clean_text(transcribe_audio_file(audio_file))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    else:
        raise HTTPException(status_code=400, detail="No input provided.")

    # ---------- Analyze Sentences ----------
    sentences = split_sentences(extracted_text)
    results = []
    for s in sentences:
        if not s.strip():
            continue
        sent_sentiment = sentiment.analyze(s)
        sent_bias = bias_clf.classify(s)
        results.append({
            "sentence": s,
            "sentiment": sent_sentiment,
            "bias": sent_bias,
            "bias_label": sent_bias,
        })

    if not results:
        raise HTTPException(status_code=400, detail="No sentences extracted for analysis.")

    return {
        "source": source,
        "text_snippet": extracted_text[:300],
        "sentence_count": len(results),
        "analysis": results,
    }