# Swiss Cell Tower Map

Open source interactive map of mobile antenna sites in Switzerland.

The project uses official data from the Swiss Federal Office of Communications (OFCOM / BAKOM).  
The raw dataset is downloaded and converted with a Python script, then displayed in an Angular web app.

Live website: [https://celltowermap.ch/](https://celltowermap.ch/)

Launched in March 2024.

## Main idea

This project makes official mobile antenna data easier to explore.

It provides:

- a clean interactive map
- simple filters
- a public data conversion script
- an open source codebase

The goal is to make the data more accessible, transparent and reusable.

## Features

- Interactive map of mobile antenna sites in Switzerland
- Filters by operator:
  - Swisscom
  - Sunrise
  - Salt
  - Other / CFF GSM-R
- Filters by technology:
  - 2G
  - 3G
  - 4G
  - 5G
- Filters by environment:
  - Outdoor
  - Indoor
  - Tunnel
- Filters by power level:
  - Very low
  - Low
  - Medium
  - High
- Marker clusters for better readability
- Popups with basic antenna site information
- Automatic data conversion from the official OFCOM dataset

## Official data source

The data comes from the Swiss Federal Office of Communications:

- Provider: OFCOM / BAKOM
- Dataset: Mobile phone base station locations
- Original coordinate system: Swiss LV95 / EPSG:2056
- Converted coordinate system: WGS84
- Source metadata: [geocat.ch](https://www.geocat.ch/geonetwork/srv/eng/catalog.search#/metadata/6a972f46-ae47-4db9-b5a7-dcfd3598bd95)

The data is not created by this project.  
This project only downloads, converts and displays the official dataset.

## Data conversion

The conversion is done with Python scripts in the `scripts/` folder.

The script:

1. downloads the latest OFCOM dataset
2. converts Swiss LV95 coordinates to WGS84
3. normalizes operators, technologies, power levels and environment types
4. merges very close antenna sites when they belong to the same operator and the same environment
5. exports a clean JSON file for the Angular frontend

Main script:

```bash
python scripts/convert_celltower_data.py
````

The generated dataset is saved in:

```text
data/processed/swiss-cell-tower-sites.json
frontend/public/data/swiss-cell-tower-sites.json
```

## Project structure

```text
celltowermap/
├── frontend/                 # Angular web application
├── scripts/                  # Python data conversion scripts
│   └── celltower_data/
├── data/
│   ├── raw/                  # Raw OFCOM data
│   └── processed/            # Converted dataset
└── .github/workflows/        # GitHub Pages deployment
```

## Run locally

### Generate the dataset

```bash
python scripts/convert_celltower_data.py
```

### Start the frontend

```bash
cd frontend
npm install
npm start
```

Then open:

```text
http://localhost:4200/
```

## Build

```bash
cd frontend
npm run build
```

## Deployment

The app is deployed with GitHub Actions to GitHub Pages.

Production website:

[https://celltowermap.ch/](https://celltowermap.ch/)

## License

The source code is open source and released under the MIT License.

The antenna data comes from OFCOM / BAKOM and is subject to its own terms of use.

## Author

Created by François Brouchoud.

