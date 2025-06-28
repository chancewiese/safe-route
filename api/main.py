# api/main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Dict, Any, Optional
from services.crime_data import get_crime_data_service, get_available_crime_files, get_file_info, clear_cache
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
async def get_crime_data(filename: Optional[str] = Query(None, description="Name of the crime data CSV file")):
    """Get crime data for heatmap display with optional filename parameter"""
    try:
        data = get_crime_data_service(filename)
        return {
            "crimeData": data,
            "filename": filename or "ogden_mock_data.csv",
            "count": len(data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crime-files")
async def get_available_files():
    """Get list of available crime data files"""
    try:
        files = get_available_crime_files()
        return {
            "available_files": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/crime-files/{filename}/info")
async def get_file_information(filename: str):
    """Get detailed information about a specific crime data file"""
    try:
        info = get_file_info(filename)
        if "error" in info:
            raise HTTPException(status_code=404, detail=info["error"])
        return info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/cache")
async def clear_data_cache(filename: Optional[str] = Query(None, description="Specific filename to clear, or all if not specified")):
    """Clear the crime data cache"""
    try:
        clear_cache(filename)
        return {
            "message": f"Cache cleared for {filename}" if filename else "All cache cleared",
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/check-route")
async def check_route_safety(request: RouteRequest, filename: Optional[str] = Query(None, description="Crime data file to use for route analysis")):
    """Check the safety of a route using specified crime data file"""
    try:
        if len(request.route) < 2:
            raise HTTPException(status_code=400, detail="Route must have at least 2 points")
        
        route_points = [{"lat": point.lat, "lng": point.lng} for point in request.route]
        
        # You could modify check_route_safety_service to accept filename parameter
        # For now, it will use the current cached data or default file
        safety_info = check_route_safety_service(route_points)
        
        return {
            **safety_info,
            "crime_data_file": filename or "ogden_mock_data.csv"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))