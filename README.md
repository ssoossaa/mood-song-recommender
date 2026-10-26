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

## Installation guide

> **For LLM / coding agents:** follow the steps below in order, from a terminal (macOS or Linux). Run every command from the repository root. Steps marked **👤 HUMAN** need a person (account sign-up, accepting a license, or a personal token): stop there, tell the user exactly what to do, and wait for them to confirm before continuing. Never create accounts, accept licenses or enter credentials on the user's behalf.

### Step 0: Prerequisites

- Python **3.9 or newer** (`python3 --version`). If missing: macOS `brew install python`, Windows `winget install --id Python.Python.3.12 -e`, Linux `sudo apt install python3 python3-venv`.
- git and a GitHub account (see Step 0b if you have neither).
- About **25 GB of free disk space** for the full Spotify dataset (zip + extracted + cleaned). You can delete the zip and `dataset_spotify/data/` after cleaning.

### Step 0b: Install git and get GitHub access (skip if `git --version` and `gh auth status` already work)

1. **👤 HUMAN:** create a free account on [github.com](https://github.com/signup) if you don't have one, send your username to the repo owner, and **accept the invitation** (e-mail or <https://github.com/ssoossaa/mood-song-recommender/invitations>). The repo is private: without an accepted invitation, cloning fails with "Repository not found".
2. Install git and the GitHub CLI (`gh`):

   - **macOS:** `xcode-select --install` installs git. For `gh`, install [Homebrew](https://brew.sh) if `brew --version` fails, then `brew install gh`.
   - **Windows:** `winget install --id Git.Git -e` and `winget install --id GitHub.cli -e`, then reopen the terminal (use *Git Bash* for the commands in this guide).
   - **Linux (Debian/Ubuntu):** `sudo apt install git gh`.

   Check: `git --version` and `gh --version` both print a version.
3. **👤 HUMAN:** log in to GitHub. Run `gh auth login`, choose *GitHub.com → HTTPS → Login with a web browser*, and enter the code shown in the browser. Then run `gh auth setup-git` so `git` uses this login.

   Check: `gh auth status` says "Logged in to github.com".

### Step 1: Clone the repository

```bash
gh repo clone ssoossaa/mood-song-recommender
cd mood-song-recommender
```

(Equivalent: `git clone https://github.com/ssoossaa/mood-song-recommender.git`.)

*No git at all?* While logged in on github.com, open the repo page, click **Code → Download ZIP**, unzip it, and open a terminal in the unzipped folder. You won't be able to pull updates, but everything else works.

### Step 2: Create the virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Check: `python -c "import pandas, matplotlib, PIL; print('ok')"` prints `ok`.

### Step 3: FER-2013 face images (~60 MB)

1. **👤 HUMAN:** create a free account on [kaggle.com](https://www.kaggle.com), go to *Settings → API → Create New Token*. This downloads `kaggle.json`. Put it in `~/.kaggle/kaggle.json`, then run `chmod 600 ~/.kaggle/kaggle.json`.
2. Download and unzip:

```bash
pip install kaggle
kaggle datasets download -d msambare/fer2013 -p fer2013 --unzip
```

Check: `ls fer2013` shows `train` and `test`, each containing 7 emotion folders (`angry disgust fear happy neutral sad surprise`).

*Fallback without the API:* the human downloads the zip from <https://www.kaggle.com/datasets/msambare/fer2013> and unzips it into `fer2013/`.

### Step 4: Spotify Million Playlist Dataset (~5.4 GB zip)

1. **👤 HUMAN:** sign in on [AIcrowd](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge), accept the challenge rules, open the *Resources* tab and download `spotify_million_playlist_dataset.zip`. Tell the agent where the file is saved (usually `~/Downloads`).
2. Unzip it into `dataset_spotify/`. The zip contains a `data/` folder with the 1,000 `mpd.slice.*.json` files:

```bash
unzip ~/Downloads/spotify_million_playlist_dataset.zip -d dataset_spotify_tmp
mkdir -p dataset_spotify/data
mv dataset_spotify_tmp/data/*.json dataset_spotify/data/
rm -rf dataset_spotify_tmp
```

Check: `ls dataset_spotify/data | wc -l` prints `1000`.

3. Clean the data (removes playlists and tracks with empty fields, writes to `dataset_spotify/data_cleaned/`). This takes a while:

```bash
python3 dataset_spotify/src/clean_data.py --max-files 1   # quick test on one file
python3 dataset_spotify/src/clean_data.py                 # full run
```

Check: `ls dataset_spotify/data_cleaned | wc -l` prints `1000`, and `python3 verifier_dimensions_spotify.py` prints the number of rows and columns.

> Short on disk space or time? The notebook only reads the first 50 slices (`N_SLICES = 50`), so the full cleaning run is optional if you clean just those files.

### Step 5: Run the notebook

```bash
jupyter notebook mood_recommender.ipynb
```

Run all cells (*Kernel → Restart & Run All*). Section 2 should print `50000` playlists and show the head of the faces table.

### Expected layout after installation

```
mood-song-recommender/
├── .venv/
├── fer2013/train/<emotion>/*.jpg
├── fer2013/test/<emotion>/*.jpg
├── dataset_spotify/data/mpd.slice.*.json          (1,000 files)
└── dataset_spotify/data_cleaned/mpd.slice.*.json  (1,000 files)
```

None of these folders are tracked by git (see `.gitignore`).

## Licenses

The Spotify MPD is for non-commercial research use only ([terms](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge/challenge_rules)). FER-2013 is distributed via Kaggle for research. Do not commit or redistribute the data.
