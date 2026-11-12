"""Recommendation logic, copied from live_demo.ipynb / mood_recommender.ipynb (sections 4.1 to 4.4).

Only one change: `tracks` is passed as an argument instead of being a global variable.
"""
import numpy as np
import pandas as pd

EMOTIONS = ["angry", "disgust", "fear", "happy", "neutral", "sad", "surprise"]

EMOTION_COORDS = {
    "happy":    (0.85, 0.70),
    "surprise": (0.65, 0.85),
    "angry":    (0.20, 0.90),
    "fear":     (0.15, 0.75),
    "disgust":  (0.20, 0.60),
    "sad":      (0.15, 0.25),
    "neutral":  (0.50, 0.45),
}
RISK_GROUPS = {
    "tension":       ["angry", "fear", "disgust"],
    "excitement":    ["happy", "surprise"],
    "low alertness": ["sad"],
    "none":          ["neutral"],
}
SAFE_POINTS = {"tension": (0.60, 0.35), "low alertness": (0.60, 0.60)}
TEMPO_RANGES = {"tension": (60, 100), "excitement": (60, 120), "low alertness": (85, 110), "none": (60, 120)}
STEER = 0.7
POPULARITY_LEVELS = [70, 50, 0]
MAX_DISTANCE = 0.15


def has_genre(genres_text, wanted):
    for genre in genres_text.split(";"):
        if genre in wanted:
            return True
    return False


def emotion_to_point(probabilities):
    valence, energy = 0.0, 0.0
    for emotion, probability in probabilities.items():
        emotion_valence, emotion_energy = EMOTION_COORDS[emotion]
        valence += probability * emotion_valence
        energy += probability * emotion_energy
    return valence, energy


def detect_driving_risk(probabilities):
    best_risk, best_score = "none", 0.0
    for risk, emotions in RISK_GROUPS.items():
        score = 0.0
        for emotion in emotions:
            score += probabilities[emotion]
        if score > best_score:
            best_risk, best_score = risk, score
    return best_risk


def driving_target(probabilities):
    valence, energy = emotion_to_point(probabilities)
    risk = detect_driving_risk(probabilities)
    if risk == "tension" or risk == "low alertness":
        safe_valence, safe_energy = SAFE_POINTS[risk]
        valence = valence + STEER * (safe_valence - valence)
        energy = energy + STEER * (safe_energy - energy)
    elif risk == "excitement":
        energy = min(energy, 0.60)
    return risk, (round(float(valence), 2), round(float(energy), 2)), TEMPO_RANGES[risk]


def recommend(tracks, probabilities, mode="match", taste=None, n=5, exclude=()):
    valence, energy = emotion_to_point(probabilities)
    candidates = tracks[~tracks["track_id"].isin(exclude)]

    if mode == "drive":
        risk, (valence, energy), (tempo_min, tempo_max) = driving_target(probabilities)
        candidates = candidates[candidates["tempo"].between(tempo_min, tempo_max)]

    if taste is not None and len(taste["genres"]) > 0:
        in_taste = candidates["genres"].apply(has_genre, wanted=taste["genres"])
        if candidates.loc[in_taste, "artists"].nunique() >= n:
            candidates = candidates[in_taste]

    distance = np.sqrt((candidates["valence"] - valence) ** 2 + (candidates["energy"] - energy) ** 2)
    candidates = candidates.assign(distance=distance.round(3))

    for level in POPULARITY_LEVELS:
        close = candidates[(candidates["popularity"] >= level) & (candidates["distance"] <= MAX_DISTANCE)]
        if close["artists"].nunique() >= n:
            break
    if close["artists"].nunique() < n:
        close = candidates

    best = close.sort_values("distance").drop_duplicates("artists").head(n)
    return best[["track_id", "track_name", "artists", "genres", "valence", "energy", "tempo", "popularity", "distance"]]


def taste_from_songs(songs):
    """Taste profile from a table of liked songs: the genres cited at least half as often as the top genre."""
    genre_counts = {}
    for genres_text in songs["genres"]:
        for genre in genres_text.split(";"):
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
    genres = set()
    if len(genre_counts) > 0:
        top_count = max(genre_counts.values())
        for genre, count in genre_counts.items():
            if count >= top_count / 2:
                genres.add(genre)
    return {"genres": genres}
