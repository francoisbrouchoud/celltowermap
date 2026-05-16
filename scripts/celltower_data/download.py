import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .config import RAW_DATA_URL, SOURCE_METADATA_URL


USER_AGENT = "celltowermap-data-converter/1.0"


def download_json(url: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT},
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def download_raw_dataset(output_file: Path) -> None:
    output_file.parent.mkdir(parents=True, exist_ok=True)

    request = urllib.request.Request(
        RAW_DATA_URL,
        headers={"User-Agent": USER_AGENT},
    )

    print(f"Downloading raw dataset from: {RAW_DATA_URL}")

    with urllib.request.urlopen(request, timeout=60) as response:
        content = response.read()

    output_file.write_bytes(content)

    print(f"Saved raw dataset: {output_file}")


def get_link_by_rel(metadata: dict[str, Any], rel: str) -> str | None:
    for link in metadata.get("links", []):
        if link.get("rel") == rel:
            return link.get("href")

    return None


def get_source_metadata() -> dict[str, Any]:
    metadata = download_json(SOURCE_METADATA_URL)

    providers = metadata.get("providers", [])
    provider = providers[0] if providers else {}

    temporal_interval = (
        metadata.get("extent", {})
        .get("temporal", {})
        .get("interval", [[None, None]])[0]
    )

    data_date_start = temporal_interval[0] if temporal_interval else None
    data_date_end = (
        temporal_interval[1]
        if temporal_interval and len(temporal_interval) > 1
        else None
    )

    return {
        "id": metadata.get("id"),
        "title": metadata.get("title"),
        "description": metadata.get("description"),
        "provider": provider.get("name", "Federal Office of Communications - OFCOM"),
        "providerUrl": provider.get("url"),
        "rawDataUrl": RAW_DATA_URL,
        "metadataUrl": SOURCE_METADATA_URL,
        "termsOfUseUrl": get_link_by_rel(metadata, "license"),
        "geocatMetadataUrl": get_link_by_rel(metadata, "describedby"),
        "furtherInformationUrl": get_link_by_rel(metadata, "about"),
        "license": metadata.get("license"),
        "createdAt": metadata.get("created"),
        "updatedAt": metadata.get("updated"),
        "dataDateStart": data_date_start,
        "dataDateEnd": data_date_end,
        "downloadedAt": datetime.now(timezone.utc).isoformat(),
    }