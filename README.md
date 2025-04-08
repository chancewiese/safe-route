# SafeRoute

A navigation application that helps users find the safest routes for walking, running, or jogging based on crime data.

## Project Structure

- `api/` - FastAPI service for data handling
  - `main.py` - API entry point
  - `services/` - Business logic
  - `data/` - CSV crime data
- `web/` - React frontend
  - Uses Google Maps API for route planning
  - Displays crime heatmaps and route safety information

## Features

- Interactive map with crime data visualization
- Route planning with safety scoring
- Multiple route alternatives based on safety
- Visual indicators for route safety levels

## Setup Instructions

### API Service Setup

1. Navigate to the API directory:
   `cd api`

2. Install dependencies:
   `pip install -r requirements.txt`

3. Run the API service:
   `python main.py`

### Frontend Setup

1. Navigate to the web directory:
   `cd web`

2. Install dependencies:
   `npm install`

3. Start the development server:
   `npm run dev`

4. Open your browser and navigate to:
   `http://localhost:5173`

## Adding Data

Put CSV crime data in `api/data/` with the following format:
`lat,lng,weight`
`34.0522,-118.2437,5`
`...`

Where:

- `lat` - Latitude of crime location
- `lng` - Longitude of crime location
- `weight` - Severity weight (1-10)
