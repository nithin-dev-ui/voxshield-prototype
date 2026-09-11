from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import subprocess

import numpy as np
import librosa
import torch

from transformers import (
    Wav2Vec2FeatureExtractor,
    AutoModelForAudioClassification,
)
import imageio_ffmpeg


# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="Voice Security AI",
    description="AI-powered voice cloning detection prototype",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# AI MODEL
# ============================================================

MODEL_ID = "Vansh180/deepfake-audio-wav2vec2"

print("Loading AI voice deepfake model...")

feature_extractor = Wav2Vec2FeatureExtractor.from_pretrained(
    MODEL_ID
)

model = AutoModelForAudioClassification.from_pretrained(
    MODEL_ID
)

model.eval()

print("AI MODEL READY")
print(model.config.id2label)


# ============================================================
# AUDIO CONVERSION
# ============================================================

def convert_webm_to_wav(webm_path: str, wav_path: str):
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

    command = [
        ffmpeg,
        "-y",
        "-i",
        webm_path,
        "-ar",
        "16000",
        "-ac",
        "1",
        wav_path,
    ]

    subprocess.run(
        command,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )


# ============================================================
# AUDIO QUALITY
# ============================================================

def calculate_audio_quality(audio):
    if len(audio) == 0:
        return 0

    rms = float(np.sqrt(np.mean(audio ** 2)))

    clipping = float(
        np.mean(np.abs(audio) >= 0.98)
    )

    rms_score = min(rms / 0.05, 1.0)
    clipping_score = max(0.0, 1.0 - clipping * 10)

    quality = (
        rms_score * 70 +
        clipping_score * 30
    )

    return round(float(np.clip(quality, 0, 100)), 1)


# ============================================================
# DEMO SPEAKER SIMILARITY
# ============================================================

def calculate_speaker_similarity(risk):
    """
    Prototype placeholder.

    This is NOT a trained speaker-verification model.
    It provides a stable demonstration value for the UI
    until a dedicated speaker-verification model is added.
    """

    similarity = 96 - (risk * 0.12)

    return round(
        float(np.clip(similarity, 70, 98)),
        1
    )


# ============================================================
# AI DEEPFAKE DETECTION
# ============================================================

def detect_fake_voice(audio):
    """
    Runs the trained Wav2Vec2 deepfake classifier.

    Model labels:
        0 = real
        1 = fake

    Returns fake probability as a 0-100 score.
    """

    # Keep inference practical on CPU.
    max_samples = 16000 * 12

    if len(audio) > max_samples:
        audio = audio[:max_samples]

    inputs = feature_extractor(
        audio,
        sampling_rate=16000,
        return_tensors="pt"
    )

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.softmax(
            outputs.logits,
            dim=-1
        )[0]

    fake_probability = float(
        probabilities[1].item()
    )

    real_probability = float(
        probabilities[0].item()
    )

    return (
        round(fake_probability * 100, 1),
        round(real_probability * 100, 1)
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/")
def root():
    return {
        "status": "online",
        "message": "Voice Security AI backend is running",
        "ai_model": MODEL_ID,
        "model_status": "loaded",
    }


# ============================================================
# ANALYZE AUDIO
# ============================================================

@app.post("/analyze")
async def analyze_audio(
    file: UploadFile = File(...)
):

    webm_path = None
    wav_path = None

    try:

        # ----------------------------------------------------
        # SAVE UPLOADED AUDIO
        # ----------------------------------------------------

        audio_bytes = await file.read()

        if not audio_bytes:
            return {
                "risk": 0,
                "speaker_similarity": 0,
                "audio_quality": 0,
                "level": "NO AUDIO",
                "action": "RECORD",
                "mode": "AI",
                "message": "No audio detected. Please record audio before analysis."
            }

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".webm"
        ) as temp_webm:

            temp_webm.write(audio_bytes)
            webm_path = temp_webm.name

        wav_path = webm_path.replace(
            ".webm",
            ".wav"
        )

        # ----------------------------------------------------
        # CONVERT WEBM → WAV
        # ----------------------------------------------------

        convert_webm_to_wav(
            webm_path,
            wav_path
        )

        # ----------------------------------------------------
        # LOAD AUDIO
        # ----------------------------------------------------

        audio, sample_rate = librosa.load(
            wav_path,
            sr=16000,
            mono=True
        )

        if len(audio) == 0:
            return {
                "risk": 0,
                "speaker_similarity": 0,
                "audio_quality": 0,
                "level": "NO AUDIO",
                "action": "RECORD",
                "mode": "AI",
                "message": "No audio detected. Please record audio before analysis."
            }

        # ----------------------------------------------------
        # SILENCE CHECK
        # ----------------------------------------------------

        rms = float(
            np.sqrt(np.mean(audio ** 2))
        )

        if rms < 0.003:

            return {
                "risk": 0,
                "speaker_similarity": 0,
                "audio_quality": 0,
                "level": "NO AUDIO",
                "action": "RECORD",
                "mode": "AI",
                "message": "No meaningful speech detected. Please record again."
            }

        # ----------------------------------------------------
        # AUDIO QUALITY
        # ----------------------------------------------------

        audio_quality = calculate_audio_quality(
            audio
        )

        # ----------------------------------------------------
        # AI DEEPFAKE DETECTION
        # ----------------------------------------------------

        fake_score, real_score = detect_fake_voice(
            audio
        )

        risk = fake_score

        # ----------------------------------------------------
        # RISK DECISION
        # ----------------------------------------------------

        if risk < 40:

            level = "LOW RISK"
            action = "ALLOW"
            message = (
                "Low synthetic-voice risk. "
                "The interaction can proceed normally."
            )

        elif risk < 70:

            level = "MEDIUM RISK"
            action = "VERIFY"
            message = (
                "Synthetic indicators require additional "
                "identity verification."
            )

        else:

            level = "HIGH RISK"
            action = "BLOCK"
            message = (
                "High synthetic-voice risk detected. "
                "Require identity verification before sensitive actions."
            )

        # ----------------------------------------------------
        # PROTOTYPE SPEAKER SIMILARITY
        # ----------------------------------------------------

        speaker_similarity = calculate_speaker_similarity(
            risk
        )

        # ----------------------------------------------------
        # RESPONSE
        # ----------------------------------------------------

        return {
            "risk": risk,

            "synthetic_voice_risk": risk,

            "real_probability": real_score,

            "fake_probability": fake_score,

            "speaker_similarity": speaker_similarity,

            "audio_quality": audio_quality,

            "level": level,

            "action": action,

            "mode": "AI",

            "model": MODEL_ID,

            "message": message,

            "analysis": {
                "synthetic_detection": {
                    "fake_score": fake_score,
                    "real_score": real_score
                },

                "speaker_verification": {
                    "similarity": speaker_similarity,
                    "status": "PROTOTYPE"
                },

                "risk_assessment": {
                    "risk": risk,
                    "level": level,
                    "action": action
                }
            }
        }

    except Exception as e:

        print("ANALYSIS ERROR:", str(e))

        return {
            "risk": 0,
            "speaker_similarity": 0,
            "audio_quality": 0,
            "level": "ERROR",
            "action": "RETRY",
            "mode": "AI",
            "message": f"Audio analysis failed: {str(e)}"
        }

    finally:

        # ----------------------------------------------------
        # CLEAN TEMP FILES
        # ----------------------------------------------------

        if webm_path and os.path.exists(webm_path):
            try:
                os.remove(webm_path)
            except:
                pass

        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except:
                pass