"""
Verifie que le dataset nettoye ne contient pas de ligne ou colonne vide.

Usage depuis la racine du projet :

    python3 src/verify_clean_data.py
"""

import argparse
import json
from pathlib import Path


PLAYLIST_COLUMNS = [
    "pid",
    "name",
    "collaborative",
    "modified_at",
    "num_tracks",
    "num_albums",
    "num_artists",
    "num_followers",
    "num_edits",
    "duration_ms",
    "tracks",
]

TRACK_COLUMNS = [
    "pos",
    "artist_name",
    "track_uri",
    "artist_uri",
    "track_name",
    "album_uri",
    "duration_ms",
    "album_name",
]


def is_empty(value):
    if value is None:
        return True
    if isinstance(value, str):
        return value.strip() == ""
    if isinstance(value, (list, dict)):
        return len(value) == 0
    return False


def find_empty_or_missing_value(row, columns):
    for column in columns:
        if column not in row:
            return column
        if is_empty(row[column]):
            return column
    return None


def verify_dataset(data_dir):
    files = sorted(data_dir.glob("mpd.slice.*.json"))
    errors = []
    playlist_rows = 0
    track_rows = 0

    for file_path in files:
        with file_path.open("r", encoding="utf-8") as file:
            data = json.load(file)

        for playlist_index, playlist in enumerate(data.get("playlists", [])):
            playlist_rows += 1

            bad_playlist_column = find_empty_or_missing_value(
                playlist, PLAYLIST_COLUMNS
            )
            if bad_playlist_column:
                errors.append(
                    f"{file_path.name}: playlist {playlist_index}, colonne vide ou absente : {bad_playlist_column}"
                )
                continue

            extra_playlist_columns = set(playlist) - set(PLAYLIST_COLUMNS)
            if extra_playlist_columns:
                errors.append(
                    f"{file_path.name}: playlist {playlist_index}, colonne inattendue : {sorted(extra_playlist_columns)}"
                )

            for track_index, track in enumerate(playlist["tracks"]):
                track_rows += 1

                bad_track_column = find_empty_or_missing_value(track, TRACK_COLUMNS)
                if bad_track_column:
                    errors.append(
                        f"{file_path.name}: playlist {playlist_index}, morceau {track_index}, colonne vide ou absente : {bad_track_column}"
                    )

                extra_track_columns = set(track) - set(TRACK_COLUMNS)
                if extra_track_columns:
                    errors.append(
                        f"{file_path.name}: playlist {playlist_index}, morceau {track_index}, colonne inattendue : {sorted(extra_track_columns)}"
                    )

                if len(errors) >= 20:
                    return files, playlist_rows, track_rows, errors

    return files, playlist_rows, track_rows, errors


def main():
    project_root = Path(__file__).resolve().parents[1]

    parser = argparse.ArgumentParser(
        description="Verifie que le dataset nettoye est propre."
    )
    parser.add_argument(
        "data_dir",
        nargs="?",
        default=project_root / "data_cleaned",
        type=Path,
        help="Dossier nettoye a verifier. Par defaut : data_cleaned/",
    )
    args = parser.parse_args()

    if not args.data_dir.exists():
        raise FileNotFoundError(
            f"Dossier introuvable : {args.data_dir}. Lance d'abord : python3 src/clean_data.py"
        )

    files, playlist_rows, track_rows, errors = verify_dataset(args.data_dir)

    if errors:
        print("PAS CLEAN")
        print(f"Problemes trouves : {len(errors)}")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    print("OK - dataset clean")
    print(f"Fichiers verifies : {len(files)}")
    print(f"Lignes playlists : {playlist_rows}")
    print(f"Lignes tracks : {track_rows}")
    print("Colonnes vides : 0")
    print("Lignes vides : 0")


if __name__ == "__main__":
    main()
