import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import (
    ANGULAR_DATA_FILE,
    COPY_TO_ANGULAR,
    DOWNLOAD_RAW_DATA,
    MERGE_DISTANCE_METERS,
    PROCESSED_DATA_FILE,
    RAW_DATA_FILE,
)
from .download import download_raw_dataset, get_source_metadata
from .transform import (
    extract_technologies,
    merge_nearby_antennas,
    normalize_operator,
    normalize_power,
    normalize_type,
)


def load_antennas(input_file: Path) -> list[dict[str, Any]]:
    with input_file.open("r", encoding="utf-8") as file:
        data = json.load(file)

    antennas = []

    for feature in data["features"]:
        properties = feature["properties"]
        easting, northing = feature["geometry"]["coordinates"]

        station = properties.get("station", "")
        operator = normalize_operator(station)

        power = normalize_power(properties.get("power_en", ""))

        antenna_type = normalize_type(
            properties.get("typ_en") or properties.get("typ_fr", ""),
            power,
        )

        technologies = extract_technologies(
            properties.get("techno_fr") or properties.get("techno_en", "")
        )

        antennas.append(
            {
                "lv95": [easting, northing],
                "station": station,
                "operator": operator,
                "technologies": technologies,
                "power": power,
                "type": antenna_type,
            }
        )

    return antennas


def save_dataset(
    output_file: Path,
    celltowers: list[dict[str, Any]],
    source_metadata: dict[str, Any],
) -> None:
    dataset = {
        "name": "celltowerdataset",
        "source": source_metadata,
        "processing": {
            "coordinateSystemInput": "EPSG:2056",
            "coordinateSystemOutput": "WGS84",
            "mergeDistanceMeters": MERGE_DISTANCE_METERS,
            "mergeRule": (
                "Antennas are merged only when they belong to the same operator, "
                "have the same type and are within 25 meters."
            ),
            "powerRule": "When antennas are merged, the highest power class is kept.",
            "technologyRule": "When antennas are merged, technologies are combined.",
            "typeFallbackRule": (
                "If OFCOM type is empty, very low power is considered indoor; "
                "low, medium and high power are considered outdoor."
            ),
            "processedAt": datetime.now(timezone.utc).isoformat(),
        },
        "celltowers": celltowers,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(dataset, file, indent=4, ensure_ascii=False)


def copy_dataset_to_angular(source_file: Path, angular_output_file: Path) -> None:
    angular_output_file.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_file, angular_output_file)


def run_pipeline() -> None:
    source_metadata = get_source_metadata()

    if DOWNLOAD_RAW_DATA:
        download_raw_dataset(RAW_DATA_FILE)

    if not RAW_DATA_FILE.exists():
        raise FileNotFoundError(f"Input file not found: {RAW_DATA_FILE}")

    antennas = load_antennas(RAW_DATA_FILE)
    celltowers = merge_nearby_antennas(antennas)

    save_dataset(PROCESSED_DATA_FILE, celltowers, source_metadata)

    if COPY_TO_ANGULAR:
        copy_dataset_to_angular(PROCESSED_DATA_FILE, ANGULAR_DATA_FILE)

    print(f"Source updated at: {source_metadata.get('updatedAt')}")
    print(f"Source data date: {source_metadata.get('dataDateStart')}")
    print(f"Loaded antennas: {len(antennas)}")
    print(f"Map points after merge: {len(celltowers)}")
    print(f"Saved dataset: {PROCESSED_DATA_FILE}")

    if COPY_TO_ANGULAR:
        print(f"Copied dataset for Angular: {ANGULAR_DATA_FILE}")