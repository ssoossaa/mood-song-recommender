"""
Compte le nombre de lignes et de colonnes du dataset Spotify MPD.

Usage simple depuis la racine du projet :

    python3 src/count_rows_columns.py

Le script utilise automatiquement data_cleaned/ si ce dossier existe.

Pour tester rapidement sur un seul fichier :

    python3 src/count_rows_columns.py --max-files 1
"""

import argparse
import json
from pathlib import Path


def get_slice_files(data_dir):
    return sorted(data_dir.glob("mpd.slice.*.json"))


def count_rows_and_columns(data_dir, max_files=None):
    playlist_rows = 0
    track_rows = 0
    playlist_columns = set()
    track_columns = set()

    slice_files = get_slice_files(data_dir)
    if max_files is not None:
        slice_files = slice_files[:max_files]

    for file_path in slice_files:
        with file_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        for playlist in data["playlists"]:
            playlist_rows += 1
            playlist_columns.update(playlist.keys())

            for track in playlist["tracks"]:
                track_rows += 1
                track_columns.update(track.keys())

    return {
        "files_count": len(slice_files),
        "playlist_rows": playlist_rows,
        "playlist_columns": sorted(playlist_columns),
        "track_rows": track_rows,
        "track_columns": sorted(track_columns),
    }


def display_results(results, data_dir):
    print("Dataset Spotify MPD")
    print(f"Dossier analyse : {data_dir}")
    print(f"Fichiers JSON analyses : {results['files_count']}")
    print()

    print("Table playlists")
    print(f"Lignes : {results['playlist_rows']}")
    print(f"Colonnes : {len(results['playlist_columns'])}")
    print("Noms des colonnes :")
    print(", ".join(results["playlist_columns"]))
    print()

    print("Table tracks")
    print(f"Lignes : {results['track_rows']}")
    print(f"Colonnes : {len(results['track_columns'])}")
    print("Noms des colonnes :")
    print(", ".join(results["track_columns"]))


def main():
    project_root = Path(__file__).resolve().parents[1]
    cleaned_data_dir = project_root / "data_cleaned"
    original_data_dir = project_root / "data"
    default_data_dir = cleaned_data_dir if cleaned_data_dir.exists() else original_data_dir

    parser = argparse.ArgumentParser(
        description="Compte les lignes et colonnes du dataset Spotify MPD."
    )
    parser.add_argument(
        "data_dir",
        nargs="?",
        default=default_data_dir,
        type=Path,
        help="Dossier qui contient les fichiers JSON du dataset. Par defaut : data_cleaned/ si disponible, sinon data/",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=None,
        help="Limite le nombre de fichiers JSON analyses, utile pour tester vite.",
    )
    args = parser.parse_args()

    if not args.data_dir.exists():
        raise FileNotFoundError(f"Le dossier n'existe pas : {args.data_dir}")

    results = count_rows_and_columns(args.data_dir, args.max_files)
    display_results(results, args.data_dir)


if __name__ == "__main__":
    main()
