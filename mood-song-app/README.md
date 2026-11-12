# MoodDrive : interface locale du Mood-Based Song Recommender

Interface web locale pour le projet [mood-song-recommender](https://github.com/ssoossaa/mood-song-recommender).
Elle reprend le notebook `live_demo.ipynb` (le Colab) sans Colab : la caméra tourne en direct dans le navigateur, et le modèle
`emotion_model.keras` tourne sur la machine. L'interface est en anglais, avec un thème clair et un thème sombre.

## Lancer

```bash
./start.sh
```

Le premier lancement installe TensorFlow (2-3 minutes) et extrait `demo_bundle.zip` (à la racine du repo). Les suivants démarrent en quelques secondes.
La page s'ouvre sur **http://localhost:8000**. Utilise Chrome, Safari ou Firefox et autorise la caméra.

Prérequis : Python 3.10 à 3.13. Node.js n'est nécessaire que pour modifier l'interface (elle est déjà compilée dans `frontend/dist`).

### Sous Windows (sans `start.sh`)

```bat
cd backend
py -3.12 -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn app:app --port 8000
```

Puis ouvre http://localhost:8000.

## Déroulé de la démo

1. **Your taste** : la personne coche quelques chansons (3 ou plus). Les genres retenus suivent la même règle que `taste_from_songs`.
2. **Scan** : « Turn on camera ». La lecture en direct montre le visage détecté, les 7 probabilités et un point qui bouge sur la carte valence/énergie.
3. **Capture & recommend** (bouton, ou barre **espace**) : compte à rebours 3-2-1, puis :
   - ce que voit le modèle (visage 48×48 en niveaux de gris) et les 7 émotions ;
   - le point sur la carte, la cible du mode Drive et la flèche de correction ;
   - le risque au volant (tension, excitation, vigilance basse, aucun) avec la règle appliquée et la plage de tempo ;
   - une chanson **Match** (colle à l'humeur) et une chanson **Drive** (plus sûre au volant), avec le lecteur Spotify.
   - la chanson Drive est ajoutée à la playlist, comme dans le notebook. Chaque nouvelle capture en ajoute une autre, sans doublon.

Solutions de secours : **Upload a photo** (selfie envoyé sur l'ordinateur) ou **Backup faces** (les 21 visages FER-2013 de `sample_faces`).

Le bouton soleil / lune en haut à droite bascule entre le thème clair et le thème sombre (le choix est mémorisé).

## Ce qui vient du projet, à l'identique

| Élément | Source |
|---|---|
| Modèle CNN (59,5 % au test) | `demo_bundle.zip → emotion_model.keras` |
| Catalogue (20 023 titres) et bibliothèque (84 titres) | `demo_tracks.csv`, `library.csv` |
| `emotion_to_point`, `detect_driving_risk`, `driving_target`, `recommend`, `taste_from_songs` | copiées dans `backend/recommender.py` |
| `predict_emotions` (image + miroir moyennés), `extract_face` (OpenCV, sinon centre de la photo) | `backend/app.py` |

Vérification : l'auto-test du notebook sur les 21 visages de secours donne **7/21**, comme dans le Colab.

Différence avec le Colab : dans Colab, le détecteur de visage OpenCV n'était pas disponible (`Face detector available: False`),
donc le centre de la photo était utilisé. Ici, le détecteur fonctionne : le visage est vraiment recadré, ce qui donne de meilleures
prédictions sur des photos de webcam.

## Vie privée

Les images de la caméra sont envoyées au serveur local (127.0.0.1), analysées en mémoire et jamais écrites sur le disque.
Rien ne sort de l'ordinateur, sauf les lecteurs Spotify intégrés (qui demandent une connexion internet).

## Structure

```
backend/      API FastAPI (le modèle et les données sont extraits de ../demo_bundle.zip dans backend/demo/ au premier lancement)
frontend/     React + Vite + Tailwind + shadcn/ui (sources dans src/, version compilée dans dist/)
start.sh      installe au besoin et lance tout
```

Pour modifier l'interface avec rechargement automatique : lance `./start.sh` dans un terminal, puis `cd frontend && npm run dev`
dans un autre, et ouvre http://localhost:5173.
