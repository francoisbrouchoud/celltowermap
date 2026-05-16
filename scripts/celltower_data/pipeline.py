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
    extract_technology_flags,
    merge_nearby_antennas,
    normalize_operator,
    normalize_power,
    normalize_type,
)


def load_json_file(input_file: Path) -> dict[str, Any]:
    with input_file.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_antennas(input_file: Path) -> list[dict[str, Any]]:
    """
    Load raw OFCOM antennas from the LV95 GeoJSON file.

    Source fields used:
    - station
    - power_en
    - techno_en
    - typ_en
    """
    data = load_json_file(input_file)
    antennas: list[dict[str, Any]] = []

    for feature in data.get("features", []):
        properties = feature.get("properties", {})
        geometry = feature.get("geometry", {})

        coordinates = geometry.get("coordinates")
        if not coordinates or len(coordinates) < 2:
            continue

        easting, northing = coordinates

        station = properties.get("station", "")
        operator = normalize_operator(station)

        power = normalize_power(properties.get("power_en", ""))

        # OFCOM field is "typ_en", not "type_en"
        antenna_type = normalize_type(
            properties.get("typ_en", ""),
            power,
        )

        technology = extract_technology_flags(
            properties.get("techno_en", "")
        )

        antennas.append(
            {
                "lv95": [easting, northing],
                "station": station,
                "operator": operator,
                "technology": technology,
                "power": power,
                "type": antenna_type,
            }
        )

    return antennas


def build_processing_metadata() -> dict[str, Any]:
    return {
        "coordinateSystemInput": "EPSG:2056",
        "coordinateSystemOutput": "WGS84",
        "mergeDistanceMeters": MERGE_DISTANCE_METERS,
        "mergeRule": (
            "Antennas are merged only when they belong to the same operator, "
            "have the same type and are within the configured distance."
        ),
        "powerRule": (
            "Power is normalized from power_en into one of: "
            "very_low, low, medium, high or unknown. "
            "When antennas are merged, the highest power class is kept."
        ),
        "technologyRule": (
            "Technology is extracted from techno_en and stored as boolean flags "
            "for 2g, 3g, 4g and 5g. "
            "When antennas are merged, technology flags are combined."
        ),
        "typeRule": (
            "Type is extracted from typ_en. "
            "If typ_en is empty, very_low power is considered indoor; "
            "low, medium and high power are considered outdoor."
        ),
        "processedAt": datetime.now(timezone.utc).isoformat(),
    }


def save_dataset(
    output_file: Path,
    celltowers: list[dict[str, Any]],
    source_metadata: dict[str, Any],
) -> None:
    dataset = {
    "name": "swiss-cell-tower-sites",
    "title": "Swiss cell tower sites",
    "source": source_metadata,
    "processing": build_processing_metadata(),
    "celltowers": celltowers,
}

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(dataset, file, indent=4, ensure_ascii=False)


def copy_dataset_to_angular(source_file: Path, angular_output_file: Path) -> None:
    angular_output_file.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_file, angular_output_file)


def run_pipeline() -> None:
    if DOWNLOAD_RAW_DATA:
        download_raw_dataset(RAW_DATA_FILE)

    if not RAW_DATA_FILE.exists():
        raise FileNotFoundError(f"Raw data file not found: {RAW_DATA_FILE}")

    source_metadata = get_source_metadata()

    antennas = load_antennas(RAW_DATA_FILE)
    celltowers = merge_nearby_antennas(antennas)

    save_dataset(
        output_file=PROCESSED_DATA_FILE,
        celltowers=celltowers,
        source_metadata=source_metadata,
    )

    if COPY_TO_ANGULAR:
        copy_dataset_to_angular(
            source_file=PROCESSED_DATA_FILE,
            angular_output_file=ANGULAR_DATA_FILE,
        )

    print(f"Source updated at: {source_metadata.get('updatedAt')}")
    print(f"Source data date: {source_metadata.get('dataDateStart')}")
    print(f"Loaded antennas: {len(antennas)}")
    print(f"Map points after merge: {len(celltowers)}")
    print(f"Saved dataset: {PROCESSED_DATA_FILE}")

    if COPY_TO_ANGULAR:
        print(f"Copied dataset for Angular: {ANGULAR_DATA_FILE}")