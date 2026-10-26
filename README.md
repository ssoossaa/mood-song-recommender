# Mood-Based Song Recommender 🎵🙂

Recommend a song from a facial expression by linking two datasets:

- **[Spotify Million Playlist Dataset (MPD)](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge)**: 1,000,000 user playlists (1,000 JSON "slices" of 1,000 playlists each, ~19 GB). Playlist titles such as *"chill"*, *"sad songs"* or *"party"* are used as mood labels.
- **[FER-2013](https://www.kaggle.com/datasets/msambare/fer2013)**: ~35,000 grayscale face images (48×48), labelled with 7 emotions: angry, disgust, fear, happy, sad, surprise, neutral.

**Pipeline:** face emotion → mood → songs most specific to playlists with that mood → recommendation.

```python
FACE_TO_MOOD = {
    "happy": "happy", "sad": "sad", "angry": "angry", "disgust": "angry",
    "fear": "fear", "surprise": "energy", "neutral": "calm",
}
```

## How it fits the 6 sections

1. **Introduction**: describe both datasets and the goal of recommending a song from a facial expression.
2. **Data Loading**: load about 50 Spotify slices into pandas (all 19 GB is too much for a notebook). Load FER-2013 from its image folders and show a few faces.
3. **Data Preparation**: normalise the titles (lowercase, strip emojis), drop playlists with no mood, flatten playlists into one row per track, and count images per emotion.
4. **Programming Logic**: this is where the course requirements fit naturally:
   - a `detect_mood(title)` function (loop over keywords, `if` to match)
   - a `top_songs_for_mood(mood)` function
   - a `recommend(face_emotion)` function that ties everything together
   - one improvement worth adding: rank songs by how *specific* they are to a mood, not by raw popularity. Otherwise *HUMBLE.* wins every mood, because it's in 46k playlists.
5. **Visualization** (you need at least two charts; these are the natural ones):
   - bar chart of images per emotion in FER-2013
   - bar chart of playlists per mood
   - horizontal bar chart of the top 10 songs for each mood
   - a grid of sample faces, each with its recommended song as the caption
6. **Conclusion**: what worked, and the limits. Titles are a noisy mood signal, and "angry" and "fear" have very few playlists, the same imbalance FER-2013 has with "disgust".

## Project structure

```
.
├── README.md
├── requirements.txt
├── mood_recommender.ipynb      # main notebook (6 sections)
├── verifier_dimensions_spotify.py
└── dataset_spotify/
    ├── src/                    # helper scripts (cleaning, stats)
    ├── data_cleaned/           # MPD slices (NOT in git, download yourself)
    └── ...
└── fer2013/                    # FER-2013 images (NOT in git, download yourself)
    ├── train/<emotion>/*.jpg
    └── test/<emotion>/*.jpg
```

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Then get the data (the datasets are **not** included in this repo because of their size and licenses):

1. **Spotify MPD**: download from [AIcrowd](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge), unzip into `dataset_spotify/data`, then clean it with `python3 dataset_spotify/src/clean_data.py` (output: `dataset_spotify/data_cleaned`).
2. **FER-2013**: download from [Kaggle](https://www.kaggle.com/datasets/msambare/fer2013) (free account required) and unzip into `fer2013/`.

Open the notebook:

```bash
jupyter notebook mood_recommender.ipynb
```

## Licenses

The Spotify MPD is for non-commercial research use only ([terms](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge/challenge_rules)). FER-2013 is distributed via Kaggle for research. Do not commit or redistribute the data.
