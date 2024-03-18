# Interactive Map of Cell Towers in Switzerland

This project presents an interactive map showcasing the locations of cell towers across Switzerland. It's a visual tool designed to display cell tower positions with distinct markers, facilitating the identification of towers operated by Swisscom, Sunrise, and Salt.

## Features

- **Data Source**: Utilizes cell tower data provided by the Swiss Federal Office of Communications (OFCOM), accessible through [this link](https://www.geocat.ch/geonetwork/srv/fre/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95).
- **Operator Categorization**: Towers are categorized by their operators - Swisscom (Blue markers), Sunrise (Red markers), and Salt (Green markers).
- **Technology Indicator**: Each tower marker includes a label indicating the type of technology used (e.g., 3G, 4G, 5G).
- **Overlap Avoidance**: Implements a strategy to adjust the positions of nearby towers, ensuring that markers do not overlap and remain clearly visible.
- **Interactive Information**: Towers come with HTML popups that provide detailed information about each location.

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
