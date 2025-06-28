# api/services/crime_data.py
import pandas as pd
import os
from pathlib import Path
from typing import Optional, List, Dict

# Cache for different crime datasets
_crime_data_cache = {}

def get_available_crime_files() -> List[str]:
    """Get list of available crime data CSV files"""
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / 'data'
    
    if not data_dir.exists():
        return []
    
    # Find all CSV files in the data directory
    csv_files = []
    for file in data_dir.glob("*.csv"):
        csv_files.append(file.name)
    
    return sorted(csv_files)

def get_crime_data_service(filename: Optional[str] = None) -> List[Dict]:
    """Load and return crime data for the API with optional filename parameter"""
    global _crime_data_cache
    
    # Default filename if none provided
    if filename is None:
        filename = "ogden_mock_data.csv"
    
    # Check cache first
    if filename in _crime_data_cache:
        print(f"DEBUG: Returning cached crime data for '{filename}' with {len(_crime_data_cache[filename])} points")
        return _crime_data_cache[filename]
    
    # Path to the CSV file
    base_dir = Path(__file__).resolve().parent.parent
    csv_path = base_dir / 'data' / filename
    
    print(f"DEBUG: Loading crime data from {csv_path}")
    
    try:
        # Check if file exists
        if not os.path.exists(csv_path):
            print(f"WARNING: CSV file '{filename}' not found at {csv_path}")
            available_files = get_available_crime_files()
            if available_files:
                print(f"Available files: {available_files}")
                # Try to use the first available file as fallback
                fallback_file = available_files[0]
                print(f"Using fallback file: {fallback_file}")
                return get_crime_data_service(fallback_file)
            else:
                print("No CSV files found, returning sample data")
                # Return sample data if no files exist
                sample_data = [
                    {"lat": 41.2230, "lng": -111.9738, "weight": 245},
                    {"lat": 41.2198, "lng": -111.9712, "weight": 180},
                    {"lat": 41.2156, "lng": -111.9689, "weight": 320}
                ]
                _crime_data_cache[filename] = sample_data
                return sample_data
            
        # Load the CSV file
        df = pd.read_csv(csv_path)
        print(f"DEBUG: Successfully read {len(df)} rows from CSV '{filename}'")
        
        # Validate required columns
        required_columns = ['lat', 'lng', 'weight']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}. Found columns: {list(df.columns)}")
        
        # Convert to list of dictionaries for the API
        crime_data = []
        for _, row in df.iterrows():
            try:
                crime_data.append({
                    'lat': float(row['lat']),
                    'lng': float(row['lng']),
                    'weight': float(row['weight']),
                })
            except Exception as e:
                print(f"DEBUG: Error processing row: {e}")
                continue
        
        print(f"DEBUG: Successfully converted {len(crime_data)} rows to dictionary format")
        
        # Cache the data
        _crime_data_cache[filename] = crime_data
        return crime_data
    
    except Exception as e:
        import traceback
        print(f"ERROR loading '{filename}': {str(e)}")
        print(traceback.format_exc())
        # Return empty list in case of error
        return []

def clear_cache(filename: Optional[str] = None):
    """Clear the cache to force reload of data"""
    global _crime_data_cache
    
    if filename:
        if filename in _crime_data_cache:
            del _crime_data_cache[filename]
            print(f"DEBUG: Cache cleared for '{filename}'")
        else:
            print(f"DEBUG: No cache found for '{filename}'")
    else:
        _crime_data_cache.clear()
        print("DEBUG: All crime data cache cleared")

def get_file_info(filename: str) -> Dict:
    """Get information about a specific crime data file"""
    try:
        data = get_crime_data_service(filename)
        if not data:
            return {"error": "No data found", "filename": filename}
        
        weights = [item['weight'] for item in data]
        
        return {
            "filename": filename,
            "record_count": len(data),
            "weight_stats": {
                "min": min(weights),
                "max": max(weights),
                "avg": sum(weights) / len(weights)
            },
            "lat_range": {
                "min": min(item['lat'] for item in data),
                "max": max(item['lat'] for item in data)
            },
            "lng_range": {
                "min": min(item['lng'] for item in data),
                "max": max(item['lng'] for item in data)
            }
        }
    except Exception as e:
        return {"error": str(e), "filename": filename}