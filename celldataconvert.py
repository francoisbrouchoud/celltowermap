import json

#Transform Swiss LV95 coordinates to WGS84
def LV95toWGS(easting, northing):

    if not (isinstance(easting, (int, float)) and isinstance(northing, (int, float))):
        raise ValueError("Easting and northing must be numeric.")

    east = (easting - 2600000) / 1E6
    north = (northing - 1200000) / 1E6

    lon = 2.6779094 + 4.728982 * east + 0.791484 * east * north + 0.1306 * east * north ** 2 - 0.0436 * east ** 3
    lon *= 100 / 36

    lat = 16.9023892 + 3.238272 * north - 0.270978 * east ** 2 - 0.002528 * north ** 2 - 0.0447 * east ** 2 * north - 0.0140 * north ** 3
    lat *= 100 / 36

    return lat, lon


# Load OFCOM cell dataset JSON
with open('data/standorte-mobilfunkanlagen_2056.json', 'r') as f:
    data = json.load(f)

new_data = {
    "name": "celltowerdataset",
    "celltowers": []
}

for feature in data['features']:
    lat, lon = LV95toWGS(*feature['geometry']['coordinates'])
    operator = feature['properties']['station'].split(" ")[0]
    technology = feature['properties']['techno_fr']
    power = feature['properties']['power_fr'].lower()

    if 'très faible' in power:
        power = 'très faible'
    elif 'faible' in power:
        power = 'faible'
    elif 'moyenne' in power:
        power = 'moyenne'
    elif 'forte' in power:
        power = 'forte'

    celltower = {
        "coordinates": [lat, lon],
        "operator": operator,
        "technology": technology,
        "power": power
    }

    new_data['celltowers'].append(celltower)

# Save the modified dataset to a new JSON file
with open('data/celltowerdataset.json', 'w') as f:
    json.dump(new_data, f, indent=4, ensure_ascii=False)
