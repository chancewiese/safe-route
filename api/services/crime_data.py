# api/services/crime_data.py
import pandas as pd
import os
from pathlib import Path

# Cache for the crime data
_crime_data_cache = None

def get_crime_data_service():
    """Load and return crime data for the API"""
    global _crime_data_cache
    
    if _crime_data_cache is not None:
        print(f"DEBUG: Returning cached crime data with {len(_crime_data_cache)} points")
        return _crime_data_cache
    
    # Path to the processed CSV file
    base_dir = Path(__file__).resolve().parent.parent
    csv_path = base_dir / 'data' / 'processed_crime_data.csv'
    
    print(f"DEBUG: Loading crime data from {csv_path}")
    
    try:
        # Check if file exists
        if not os.path.exists(csv_path):
            print(f"WARNING: CSV file not found at {csv_path}, returning sample data")
            # Return sample data if file doesn't exist
            _crime_data_cache = [
                {"lat": 34.052, "lng": -118.243, "weight": 5},
                {"lat": 34.049, "lng": -118.239, "weight": 3},
                {"lat": 34.047, "lng": -118.245, "weight": 8}
            ]
            return _crime_data_cache
            
        # Load the CSV file
        df = pd.read_csv(csv_path)
        print(f"DEBUG: Successfully read {len(df)} rows from CSV")
        
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
        _crime_data_cache = crime_data
        return crime_data
    
    except Exception as e:
        import traceback
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        # Return empty list in case of error
        return []