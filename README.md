# Interactive Map of Cell Towers in Switzerland

This project presents an interactive map showcasing the locations of cell towers across Switzerland. It's a visual tool designed to display cell tower positions with distinct markers, facilitating the identification of towers operated by Swisscom, Sunrise, and Salt. When clicking on a marker, users can view a popup that reveals the technology used by the tower (3G, 4G, 5G) and the antenna's signal strength. This feature adds an additional layer of detail, making it easier for users to understand the network capabilities in their area.

## Features

- **Data Source**: Utilizes cell tower data provided by the Swiss Federal Office of Communications (OFCOM), accessible through [this link](https://www.geocat.ch/geonetwork/srv/fre/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95).
- **Operator Categorization**: Towers are categorized by their operators - Swisscom (Blue markers), Sunrise (Red markers), and Salt (Green markers).
- **Technology Indicator**: Each tower marker includes a label indicating the type of technology used (e.g., 3G, 4G, 5G).
- **Overlap Avoidance**: Implements a strategy to adjust the positions of nearby towers, ensuring that markers do not overlap and remain clearly visible.
- **Interactive Information**: Towers come with HTML popups that provide detailed information about each location.

## How It Works

1. **Dataset**: First, load the latest JSON dataset from OFCOM [here](https://www.geocat.ch/geonetwork/srv/fre/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95)
2. **Data conversion**: Convert the dataset, including transforming Swiss LV95 coordinates into international GPS coordinates, which can be done using `celldataconvert.py`.
3. **Create map**: Run `main.py` to execute the script, which generates the interactive map. The map is saved as `index.html`.

## Dependencies

- `folium`: For creating and manipulating the interactive map.
- `math`: Utilized for mathematical operations, particularly in adjusting tower positions to prevent overlap.
- `json`: For loading and parsing the cell tower data from the JSON file.

## Link to the deployed map
[https://celltowermap.ch/](https://celltowermap.ch/)

## About the Author

**François Brouchoud**  
Creation Date: March 18, 2024

This project is designed to offer an insightful visualization of the cell tower infrastructure in Switzerland, leveraging open data to enhance transparency and accessibility.
