import math
from collections import defaultdict
from typing import Any

from .config import MERGE_DISTANCE_METERS


def lv95_to_wgs(easting: float, northing: float) -> tuple[float, float]:
    if not isinstance(easting, (int, float)) or not isinstance(northing, (int, float)):
        raise ValueError("Easting and northing must be numeric.")

    east = (easting - 2600000) / 1_000_000
    north = (northing - 1200000) / 1_000_000

    lon = (
        2.6779094
        + 4.728982 * east
        + 0.791484 * east * north
        + 0.1306 * east * north**2
        - 0.0436 * east**3
    )
    lon *= 100 / 36

    lat = (
        16.9023892
        + 3.238272 * north
        - 0.270978 * east**2
        - 0.002528 * north**2
        - 0.0447 * east**2 * north
        - 0.0140 * north**3
    )
    lat *= 100 / 36

    return lat, lon


def normalize_operator(station: str) -> str:
    if not station:
        return "unknown"

    return station.split(" ")[0]


def normalize_power(power_input: str) -> str:
    power_input = (power_input or "").lower()

    if "very low" in power_input:
        return "très faible"
    if "low" in power_input:
        return "faible"
    if "medium" in power_input:
        return "moyenne"
    if "high" in power_input:
        return "forte"

    return "unknown"


def power_rank(power: str) -> int:
    ranks = {
        "unknown": 0,
        "très faible": 1,
        "faible": 2,
        "moyenne": 3,
        "forte": 4,
    }

    return ranks.get(power, 0)


def normalize_type(type_input: str, power: str) -> str:
    """
    Normalize antenna type.

    If OFCOM type is empty:
    - très faible => indoor
    - faible / moyenne / forte => outdoor
    """
    type_input = (type_input or "").lower().strip()

    if "indoor" in type_input:
        return "indoor"

    if "outdoor" in type_input:
        return "outdoor"

    if "tunnel" in type_input:
        return "tunnel"

    if power == "très faible":
        return "indoor"

    if power in ["faible", "moyenne", "forte"]:
        return "outdoor"

    return "unknown"


def extract_technologies(technology_input: str) -> list[str]:
    technology_input = technology_input or ""

    technologies = []

    for technology in ["2G", "3G", "4G", "5G"]:
        if technology in technology_input:
            technologies.append(technology)

    return technologies


def merge_technologies(technology_lists: list[list[str]]) -> str:
    order = ["2G", "3G", "4G", "5G"]
    merged = set()

    for technologies in technology_lists:
        merged.update(technologies)

    sorted_technologies = [technology for technology in order if technology in merged]

    if not sorted_technologies:
        return "Technologie inconnue"

    return "Technologie " + ",".join(sorted_technologies)


def distance_lv95(point_a: list[float], point_b: list[float]) -> float:
    easting_a, northing_a = point_a
    easting_b, northing_b = point_b

    return math.sqrt((easting_a - easting_b) ** 2 + (northing_a - northing_b) ** 2)


class UnionFind:
    def __init__(self, size: int) -> None:
        self.parent = list(range(size))

    def find(self, item: int) -> int:
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])

        return self.parent[item]

    def union(self, item_a: int, item_b: int) -> None:
        root_a = self.find(item_a)
        root_b = self.find(item_b)

        if root_a != root_b:
            self.parent[root_b] = root_a


def merge_nearby_antennas(antennas: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Merge antennas only if:
    - same operator
    - same type: indoor, outdoor, tunnel or unknown
    - distance <= 25 meters in LV95 coordinates
    """
    union_find = UnionFind(len(antennas))
    grid = defaultdict(list)

    cell_size = MERGE_DISTANCE_METERS

    for index, antenna in enumerate(antennas):
        easting, northing = antenna["lv95"]
        operator = antenna["operator"]
        antenna_type = antenna["type"]

        grid_x = int(easting // cell_size)
        grid_y = int(northing // cell_size)

        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                nearby_key = (operator, antenna_type, grid_x + dx, grid_y + dy)

                for other_index in grid[nearby_key]:
                    other_antenna = antennas[other_index]

                    if distance_lv95(antenna["lv95"], other_antenna["lv95"]) <= MERGE_DISTANCE_METERS:
                        union_find.union(index, other_index)

        grid[(operator, antenna_type, grid_x, grid_y)].append(index)

    groups = defaultdict(list)

    for index, antenna in enumerate(antennas):
        root = union_find.find(index)
        groups[root].append(antenna)

    return [build_merged_antenna(group) for group in groups.values()]


def build_merged_antenna(group: list[dict[str, Any]]) -> dict[str, Any]:
    representative = max(
        group,
        key=lambda antenna: power_rank(antenna["power"]),
    )

    latitude, longitude = lv95_to_wgs(*representative["lv95"])

    original_stations = sorted(
        set(antenna["station"] for antenna in group if antenna["station"])
    )

    return {
        "coordinates": [latitude, longitude],
        "operator": representative["operator"],
        "technology": merge_technologies(
            [antenna["technologies"] for antenna in group]
        ),
        "power": representative["power"],
        "type": representative["type"],
        "mergedCount": len(group),
        "originalStations": original_stations,
    }