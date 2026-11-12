"""Local API for the Mood-Based Song Recommender.

Same pipeline as live_demo.ipynb: photo -> face (OpenCV) -> 48x48 grayscale -> CNN -> 7 emotion
probabilities -> point on the valence/energy map -> recommendation (match mode and drive mode).
Photos are processed in memory only and never written to disk.
"""
import base64
import io
import json
import os
import threading
import zipfile
from pathlib import Path

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import cv2
import keras
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, ImageOps

from recommender import (
    EMOTION_COORDS, EMOTIONS, MAX_DISTANCE, SAFE_POINTS, TEMPO_RANGES,
    driving_target, emotion_to_point, recommend, taste_from_songs,
)

BASE_DIR = Path(__file__).resolve().parent
DEMO_DIR = BASE_DIR / "demo"
DEMO_BUNDLE = BASE_DIR.parent.parent / "demo_bundle.zip"  # the bundle at the root of the repo (same as for Colab)
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
SAMPLES_DIR = DEMO_DIR / "sample_faces" / "test"
TEST_ACCURACY = 0.5949  # training_outputs/model_scores.csv (cnn)

# ---------------------------------------------------------------- data + model
# Like section 1 of live_demo.ipynb: unpack demo_bundle.zip once (model, catalogue, backup faces).
if not (DEMO_DIR / "emotion_model.keras").exists():
    if not DEMO_BUNDLE.exists():
        raise SystemExit(f"demo_bundle.zip introuvable : attendu dans {DEMO_BUNDLE}")
    with zipfile.ZipFile(DEMO_BUNDLE) as bundle:
        bundle.extractall(DEMO_DIR)
    print(f"Fichiers de démo extraits dans {DEMO_DIR}")

tracks = pd.read_csv(DEMO_DIR / "demo_tracks.csv")
library = pd.read_csv(DEMO_DIR / "library.csv")
model = keras.models.load_model(DEMO_DIR / "emotion_model.keras")
model_lock = threading.Lock()

try:
    face_detector = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    DETECTOR_OK = not face_detector.empty()
except Exception:
    DETECTOR_OK = False


def predict_emotions(face48):
    """face48: a 48x48 grayscale PIL image. Returns {emotion: probability}.
    The image and its mirror are both predicted and averaged (same as the notebook, in one batch)."""
    x = np.array(face48.convert("L"), dtype="float32")[None, ..., None] / 255.0
    batch = np.concatenate([x, x[:, :, ::-1, :]])
    with model_lock:
        proba = np.asarray(model(batch, training=False)).mean(axis=0)
    return {emotion: float(p) for emotion, p in zip(EMOTIONS, proba)}


def extract_face(photo, min_size=60):
    """Find the largest face in a PIL photo and return it as a 48x48 grayscale image, like the training images.
    If no face is found, the central part of the photo is used instead. Also returns the box (relative 0-1)."""
    gray = np.array(photo.convert("L"))
    height, width = gray.shape
    boxes = []
    if DETECTOR_OK:
        boxes = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(min_size, min_size))
    if len(boxes) > 0:
        x, y, w, h = max(boxes, key=lambda box: box[2] * box[3])
        found = True
    else:
        side = int(min(height, width) * 0.6)
        x, y, w, h = (width - side) // 2, (height - side) // 2, side, side
        found = False
    face = Image.fromarray(gray[y:y + h, x:x + w]).resize((48, 48))
    box = {"x": x / width, "y": y / height, "w": w / width, "h": h / height}
    return face, found, box


def read_photo(content: bytes):
    try:
        return ImageOps.exif_transpose(Image.open(io.BytesIO(content))).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Image illisible.")


def to_data_url(image):
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()


def song_dict(row):
    return {
        "track_id": row["track_id"],
        "track_name": row["track_name"],
        "artists": row["artists"],
        "genres": row["genres"],
        "valence": round(float(row["valence"]), 3),
        "energy": round(float(row["energy"]), 3),
        "tempo": round(float(row["tempo"]), 1),
        "popularity": int(row["popularity"]),
        "distance": round(float(row["distance"]), 3),
    }


def parse_ids(text):
    try:
        ids = json.loads(text) if text else []
        return [str(i) for i in ids]
    except Exception:
        raise HTTPException(status_code=400, detail="Liste d'identifiants invalide.")


# ---------------------------------------------------------------- API
app = FastAPI(title="Mood-Based Song Recommender")


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "detector": DETECTOR_OK,
        "tracks": len(tracks),
        "library": len(library),
        "test_accuracy": TEST_ACCURACY,
    }


@app.get("/api/config")
def config():
    """Constants used by the interface to draw the valence/energy map."""
    return {
        "emotions": EMOTIONS,
        "emotion_coords": {e: {"valence": v, "energy": en} for e, (v, en) in EMOTION_COORDS.items()},
        "safe_points": {r: {"valence": v, "energy": en} for r, (v, en) in SAFE_POINTS.items()},
        "tempo_ranges": TEMPO_RANGES,
        "max_distance": MAX_DISTANCE,
    }


@app.get("/api/library")
def get_library():
    columns = ["family", "track_id", "track_name", "artists", "genres", "popularity", "valence", "energy", "tempo"]
    return library[columns].to_dict(orient="records")


@app.get("/api/map-points")
def map_points():
    """A fixed random sample of the catalogue, drawn as the background of the map."""
    sample = tracks.sample(n=min(1800, len(tracks)), random_state=42)
    return [[round(float(v), 3), round(float(e), 3)] for v, e in zip(sample["valence"], sample["energy"])]


@app.get("/api/samples")
def samples():
    result = []
    for emotion in EMOTIONS:
        for index, path in enumerate(sorted((SAMPLES_DIR / emotion).glob("*.jpg"))):
            result.append({"emotion": emotion, "index": index, "url": f"/api/samples/{emotion}/{index}"})
    return result


@app.get("/api/samples/{emotion}/{index}")
def sample_image(emotion: str, index: int):
    if emotion not in EMOTIONS:
        raise HTTPException(status_code=404)
    paths = sorted((SAMPLES_DIR / emotion).glob("*.jpg"))
    if index < 0 or index >= len(paths):
        raise HTTPException(status_code=404)
    return FileResponse(paths[index])


@app.post("/api/live")
async def live(image: UploadFile = File(...)):
    """Fast path for the live camera preview: face box + emotion probabilities, no recommendation."""
    photo = read_photo(await image.read())
    face, found, box = extract_face(photo, min_size=40)
    return {"probabilities": predict_emotions(face), "face_found": found, "face_box": box}


@app.post("/api/analyze")
async def analyze(
    image: UploadFile | None = File(None),
    sample_emotion: str | None = Form(None),
    sample_index: int | None = Form(None),
    liked: str = Form("[]"),
    exclude: str = Form("[]"),
):
    """Full pipeline of run_demo(): emotions, map point, driving risk, one song per mode."""
    if image is not None:
        photo = read_photo(await image.read())
        face, found, box = extract_face(photo)
    elif sample_emotion is not None and sample_index is not None:
        # Backup faces are already 48x48 face crops: used as is, like in the notebook
        if sample_emotion not in EMOTIONS:
            raise HTTPException(status_code=404)
        paths = sorted((SAMPLES_DIR / sample_emotion).glob("*.jpg"))
        if sample_index < 0 or sample_index >= len(paths):
            raise HTTPException(status_code=404)
        face, found, box = Image.open(paths[sample_index]).convert("L"), True, None
    else:
        raise HTTPException(status_code=400, detail="Aucune image reçue.")

    probabilities = predict_emotions(face)
    valence, energy = emotion_to_point(probabilities)
    risk, drive_point, tempo_range = driving_target(probabilities)

    liked_ids = parse_ids(liked)
    already = parse_ids(exclude)
    chosen = tracks[tracks["track_id"].isin(liked_ids)]
    taste = taste_from_songs(chosen)

    match = recommend(tracks, probabilities, mode="match", taste=taste, n=1, exclude=already)
    if len(match) == 0:
        raise HTTPException(status_code=409, detail="Plus aucune chanson disponible.")
    match_song = match.iloc[0]
    drive = recommend(tracks, probabilities, mode="drive", taste=taste, n=1,
                      exclude=already + [match_song["track_id"]])
    if len(drive) == 0:
        raise HTTPException(status_code=409, detail="Plus aucune chanson disponible.")
    drive_song = drive.iloc[0]

    return {
        "probabilities": probabilities,
        "top_emotion": max(probabilities, key=probabilities.get),
        "face_found": found,
        "face_box": box,
        "face_image": to_data_url(face.resize((48, 48))),
        "point": {"valence": round(float(valence), 3), "energy": round(float(energy), 3)},
        "risk": risk,
        "drive_point": {"valence": drive_point[0], "energy": drive_point[1]},
        "tempo_range": list(tempo_range),
        "taste_genres": sorted(taste["genres"]),
        "match": song_dict(match_song),
        "drive": song_dict(drive_song),
    }


# ---------------------------------------------------------------- frontend (built)
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
