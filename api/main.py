# api/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Dict, Any
from services.crime_data import get_crime_data_service
from services.route_safety import check_route_safety_service

app = FastAPI(
    title="Safe Route API",
    description="API for calculating safe routes based on crime data",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RoutePoint(BaseModel):
    lat: float
    lng: float

class RouteRequest(BaseModel):
    route: List[RoutePoint]

@app.get("/")
async def root():
    return {"message": "Welcome to the Safe Route API"}

@app.get("/api/crime-data")
async def get_crime_data():
    """Get crime data for heatmap display"""
    try:
        data = get_crime_data_service()
        return {"crimeData": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-route")
async def check_route_safety(request: RouteRequest):
    """Check the safety of a route"""
    try:
        if len(request.route) < 2:
            raise HTTPException(status_code=400, detail="Route must have at least 2 points")
        
        route_points = [{"lat": point.lat, "lng": point.lng} for point in request.route]
        safety_info = check_route_safety_service(route_points)
        return safety_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))