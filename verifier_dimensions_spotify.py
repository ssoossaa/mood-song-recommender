from pathlib import Path
import json
import re

import pandas as pd


dossier_dataset = Path(
    "/Users/flavien/Projects/spotify_python/dataset_spotify"
)

fichiers_csv = sorted(dossier_dataset.rglob("*.csv"))
fichiers_json = sorted(dossier_dataset.rglob("*.json"))
fichier_stats = dossier_dataset / "stats.txt"

if fichiers_csv:
    for fichier in fichiers_csv:
        df = pd.read_csv(fichier)

        nombre_lignes, nombre_colonnes = df.shape

        print(f"\nFichier : {fichier.name}")
        print(f"Nombre de lignes : {nombre_lignes}")
        print(f"Nombre de colonnes : {nombre_colonnes}")

elif fichiers_json:
    with open(fichiers_json[0], "r", encoding="utf-8") as f:
        data = json.load(f)

    df = pd.DataFrame(data["playlists"])

    if fichier_stats.exists():
        texte_stats = fichier_stats.read_text(encoding="utf-8")
        resultat = re.search(r"number of playlists\s+(\d+)", texte_stats)
        nombre_lignes = int(resultat.group(1)) if resultat else len(df)
    else:
        nombre_lignes = len(df) * len(fichiers_json)

    nombre_colonnes = df.shape[1]

    print("Dataset Spotify")
    print(f"Nombre de lignes : {nombre_lignes}")
    print(f"Nombre de colonnes : {nombre_colonnes}")
    print(f"Colonnes : {', '.join(df.columns)}")

else:
    print("Aucun fichier CSV ou JSON trouve dans ce dossier.")
