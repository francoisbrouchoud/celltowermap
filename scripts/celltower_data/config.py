from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]

RAW_DATA_URL = (
    "https://data.geo.admin.ch/ch.bakom.standorte-mobilfunkanlagen/"
    "standorte-mobilfunkanlagen/standorte-mobilfunkanlagen_2056.json"
)

SOURCE_METADATA_URL = (
    "https://data.geo.admin.ch/api/stac/v0.9/collections/"
    "ch.bakom.standorte-mobilfunkanlagen"
)

RAW_DATA_FILE = BASE_DIR / "data" / "raw" / "standorte-mobilfunkanlagen_2056.json"
PROCESSED_DATA_FILE = BASE_DIR / "data" / "processed" / "celltowerdataset.json"
ANGULAR_DATA_FILE = BASE_DIR / "frontend" / "public" / "data" / "celltowerdataset.json"

MERGE_DISTANCE_METERS = 25

DOWNLOAD_RAW_DATA = True
COPY_TO_ANGULAR = True