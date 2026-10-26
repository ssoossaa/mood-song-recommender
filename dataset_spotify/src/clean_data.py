"""
Nettoie le dataset Spotify MPD sans modifier les fichiers originaux.

Usage depuis la racine du projet :

    python3 src/clean_data.py

Test rapide sur un seul fichier :

    python3 src/clean_data.py --max-files 1
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


def has_empty_required_value(row, columns):
    return any(column not in row or is_empty(row[column]) for column in columns)


def clean_track(track):
    if has_empty_required_value(track, TRACK_COLUMNS):
        return None
    return {column: track[column] for column in TRACK_COLUMNS}


def clean_playlist(playlist):
    if has_empty_required_value(playlist, PLAYLIST_COLUMNS):
        return None

    cleaned_tracks = []
    for track in playlist["tracks"]:
        cleaned_track = clean_track(track)
        if cleaned_track is not None:
            cleaned_tracks.append(cleaned_track)

    if not cleaned_tracks:
        return None

    cleaned_playlist = {
        column: playlist[column]
        for column in PLAYLIST_COLUMNS
        if column != "tracks"
    }
    cleaned_playlist["tracks"] = cleaned_tracks

    # Si des morceaux invalides ont ete retires, on recalcule les compteurs.
    cleaned_playlist["num_tracks"] = len(cleaned_tracks)
    cleaned_playlist["num_albums"] = len({track["album_uri"] for track in cleaned_tracks})
    cleaned_playlist["num_artists"] = len(
        {track["artist_uri"] for track in cleaned_tracks}
    )
    cleaned_playlist["duration_ms"] = sum(
        track["duration_ms"] for track in cleaned_tracks
    )

    return cleaned_playlist


def clean_file(input_file, output_file):
    with input_file.open("r", encoding="utf-8") as file:
        data = json.load(file)

    original_playlists = len(data["playlists"])
    original_tracks = sum(len(playlist["tracks"]) for playlist in data["playlists"])

    cleaned_playlists = []
    for playlist in data["playlists"]:
        cleaned_playlist = clean_playlist(playlist)
        if cleaned_playlist is not None:
            cleaned_playlists.append(cleaned_playlist)

    cleaned_tracks = sum(len(playlist["tracks"]) for playlist in cleaned_playlists)

    cleaned_data = {
        "info": data.get("info", {}),
        "playlists": cleaned_playlists,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    temporary_file = output_file.with_suffix(output_file.suffix + ".tmp")
    with temporary_file.open("w", encoding="utf-8") as file:
        json.dump(cleaned_data, file, ensure_ascii=False)
    temporary_file.replace(output_file)

    return {
        "playlists_removed": original_playlists - len(cleaned_playlists),
        "tracks_removed": original_tracks - cleaned_tracks,
        "playlists_kept": len(cleaned_playlists),
        "tracks_kept": cleaned_tracks,
    }


def get_slice_files(input_dir):
    return sorted(input_dir.glob("mpd.slice.*.json"))


def clean_dataset(input_dir, output_dir, max_files=None):
    input_files = get_slice_files(input_dir)
    if max_files is not None:
        input_files = input_files[:max_files]

    totals = {
        "files_cleaned": 0,
        "playlists_removed": 0,
        "tracks_removed": 0,
        "playlists_kept": 0,
        "tracks_kept": 0,
    }

    for index, input_file in enumerate(input_files, start=1):
        output_file = output_dir / input_file.name
        result = clean_file(input_file, output_file)

        totals["files_cleaned"] += 1
        totals["playlists_removed"] += result["playlists_removed"]
        totals["tracks_removed"] += result["tracks_removed"]
        totals["playlists_kept"] += result["playlists_kept"]
        totals["tracks_kept"] += result["tracks_kept"]

        if index == 1 or index % 50 == 0 or index == len(input_files):
            print(f"{index}/{len(input_files)} fichiers nettoyes...")

    return totals


def main():
    project_root = Path(__file__).resolve().parents[1]

    parser = argparse.ArgumentParser(
        description="Nettoie le dataset Spotify MPD dans un nouveau dossier."
    )
    parser.add_argument(
        "--input-dir",
        default=project_root / "data",
        type=Path,
        help="Dossier du dataset original. Par defaut : data/",
    )
    parser.add_argument(
        "--output-dir",
        default=project_root / "data_cleaned",
        type=Path,
        help="Dossier de sortie nettoye. Par defaut : data_cleaned/",
    )
    parser.add_argument(
        "--max-files",
        default=None,
        type=int,
        help="Limite le nombre de fichiers, utile pour tester rapidement.",
    )
    args = parser.parse_args()

    if not args.input_dir.exists():
        raise FileNotFoundError(f"Dossier introuvable : {args.input_dir}")

    totals = clean_dataset(args.input_dir, args.output_dir, args.max_files)

    print()
    print("Nettoyage termine")
    print(f"Fichiers nettoyes : {totals['files_cleaned']}")
    print(f"Playlists conservees : {totals['playlists_kept']}")
    print(f"Playlists supprimees : {totals['playlists_removed']}")
    print(f"Morceaux conserves : {totals['tracks_kept']}")
    print(f"Morceaux supprimes : {totals['tracks_removed']}")
    print(f"Dossier nettoye : {args.output_dir}")


if __name__ == "__main__":
    main()
