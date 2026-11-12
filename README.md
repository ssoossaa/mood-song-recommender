# Mood-Based Song Recommender

From a driver's facial expression to a safer playlist.

## Contents

- `mood_recommender.ipynb`: main notebook (6 sections). Runs in a few seconds, no GPU needed.
- `train_emotion_classifier.ipynb`: trains the emotion classifier on Google Colab (GPU) and exports `predictions_test.csv`.
- `data/spotify_tracks.csv`: Spotify Tracks Dataset, as downloaded from Kaggle (114,000 rows).
- `data/predictions_test.csv`: classifier output on the 7,178 FER-2013 test images.
- `data/sample_faces/`: 21 FER-2013 test images used for the illustrations.
- `training_outputs/`: scores, training history, confusion matrix and learning curves of the classifier used here (59.5% test accuracy).
- `live_demo.ipynb`: live demo on Google Colab (song library, webcam or uploaded photo, recommendation).
- `demo_bundle.zip`: files the live demo asks for (trained model, cleaned catalogue, backup faces).
- `mood-song-app/`: MoodDrive, the same live demo as a local web app (live webcam, light and dark themes). See its README.

## Run

```bash
pip install -r requirements.txt
jupyter notebook mood_recommender.ipynb
```

Then *Kernel → Restart & Run All*. Run the notebook from this folder so that `data/` is found.

## Live demo

Open `live_demo.ipynb` in Google Colab, run section 1 and upload `demo_bundle.zip` when asked, then follow sections 2 to 4.

Or run it locally as a web app, with the webcam analysed live:

```bash
./mood-song-app/start.sh
```

Then open http://localhost:8000 (details in `mood-song-app/README.md`).

## Working as a team

Two people editing the same notebook at the same time will overwrite each other. Agree on who edits which file, and download the latest version before starting.

## Sources

- Spotify Tracks Dataset: https://www.kaggle.com/datasets/maharshipandya/-spotify-tracks-dataset
- FER-2013: https://www.kaggle.com/datasets/msambare/fer2013
