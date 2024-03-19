"""
Interactive map of cell towers in Switzerland

This script creates a map showing cell tower locations in Switzerland.
It uses Folium, a mapping tool, to draw the map and place markers for each cell tower.
The towers are marked in different colors according to the operator: Swisscom (blue), Sunrise (red), and Salt (green).
Each marker also includes a number indicating the type of technology the tower uses, like 3G, 4G, or 5G.

Author: François Brouchoud
Creation Date: 18.03.2024

Features:
- Loads cell tower data from a JSON file.
- Categorizes towers by operator.
- Adjusts positions of nearby towers to prevent marker overlap.
- Displays detailed tower information via HTML popups.

Dependencies: folium, math, json
"""

import math
import folium
from folium.plugins import MarkerCluster
import json
from folium.map import Element

# Define marker color for operator and icon for technology
def choose_icon(station, techno):
    colors = {
        'Swisscom': 'darkblue',
        'Sunrise': 'red',
        'Salt': 'green'
    }
    color = colors.get(station.split(' ')[0], 'black')
    icon_prefix = (
        '5' if '5G' in techno
        else '4' if '4G' in techno
        else '3' if '3G' in techno
        else '2' if '2G' in techno
        else None
    )
    return folium.Icon(color=color, icon=icon_prefix, prefix='fa')

# Popup celltower informations
def create_popup(station_name, techno, power):
    popup_html = f"""
    <div style="font-family: Arial; font-size: 12px;">
        <h3>{station_name}</h3>
        <h5>{techno}</h5>
        <h5>Puissance {power}</h5>
    </div>
    """
    return folium.Popup(html=popup_html, max_width=300)

def calculate_distance(lat1, lon1, lat2, lon2):
    # Calcul basique de la distance euclidienne
    return math.sqrt((lat2 - lat1) ** 2 + (lon2 - lon1) ** 2)

# Proximity tolerance between two antennas
tolerance = 0.001


# Map initialisation
map = folium.Map(location=[46.8182, 8.2275])
marker_cluster = MarkerCluster().add_to(map)

swisscom_cluster = MarkerCluster(name='Swisscom')
sunrise_cluster = MarkerCluster(name='Sunrise')
salt_cluster = MarkerCluster(name='Salt')

# JSON Load (data from OFCOM https://www.geocat.ch/geonetwork/srv/fre/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95)
with open("data/celltowerdataset.json", 'r') as file:
    celltowerdataset = json.load(file)

# If two cells are too near, we add space
points_tracker = {}
decalage_droite = 0.0002
decalage_bas = -0.0002

# Loop on cells
for cell in celltowerdataset['celltowers']:
    lat_WGS, lon_WGS = cell['coordinates']

    point_modified = False

    # Check if two cells are too near, we add space
    for (existing_lat, existing_lon), (count, last_direction) in points_tracker.items():
        if calculate_distance(lat_WGS, lon_WGS, existing_lat, existing_lon) < tolerance:
            point_modified = True
            if last_direction == 'right' or count == 0:
                lat_WGS += decalage_bas
                last_direction = 'down'
            elif last_direction == 'down':
                lon_WGS += decalage_droite
                last_direction = 'right'

            points_tracker[(existing_lat, existing_lon)] = (count + 1, last_direction)
            break

    if not point_modified:
        points_tracker[(lat_WGS, lon_WGS)] = (0, '')

    station_name = cell['operator']
    techno = cell['technology']
    power = cell['power']

    icon = choose_icon(station_name, techno)
    popup = create_popup(station_name, techno, power)
    marker = folium.Marker(location=[lat_WGS, lon_WGS], popup=popup, icon=icon)

    # Add marker top cluster
    if 'Swisscom' in station_name:
        swisscom_cluster.add_child(marker)
    elif 'Sunrise' in station_name:
        sunrise_cluster.add_child(marker)
    elif 'Salt' in station_name:
        salt_cluster.add_child(marker)

map.add_child(swisscom_cluster)
map.add_child(sunrise_cluster)
map.add_child(salt_cluster)

folium.LayerControl().add_to(map)


# Adding footer
footer_content = ('Repo open source : '
                  '<a href="https://github.com/francoisbrouchoud/celltowermap" target="_blank">github.com/francoisbrouchoud/celltowermap</a> '
                  'sous licence MIT <br> Source des données : <a href="https://www.geocat.ch/geonetwork/srv/fre/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95" target="_blank">OFCOM</a> '
                  'récupéré le 16.03.2024 | ')

script = Element("""
<script type="text/javascript">
    document.addEventListener("DOMContentLoaded", function() {{
      var attributionDiv = document.querySelector('.leaflet-control-attribution');
      if (attributionDiv) {{
        var firstLink = attributionDiv.querySelector('a');
        var newContent = document.createElement('span');
        newContent.innerHTML = `{new_content}`;
        attributionDiv.insertBefore(newContent, firstLink);
      }}
    }});
</script>
""".format(new_content=footer_content))


map.get_root().html.add_child(script)

map.save('index.html')