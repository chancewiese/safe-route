from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.core.cache import cache
import json
import os
import math
import pandas as pd
from pathlib import Path

# Cache for the crime data
crime_data_cache = None

def load_crime_data():
    """Load pre-processed crime data from CSV"""
    global crime_data_cache
    
    if crime_data_cache is not None:
        print(f"DEBUG: Returning cached crime data with {len(crime_data_cache)} points")
        return crime_data_cache
    
    # Path to the processed CSV file
    base_dir = Path(__file__).resolve().parent
    csv_path = base_dir / 'data' / 'processed_crime_data.csv'
    
    print(f"DEBUG: Loading crime data from {csv_path}")
    
    try:
        # Check if file exists and get size
        if not os.path.exists(csv_path):
            print(f"DEBUG: CSV file not found at {csv_path}")
            return []
            
        file_size = os.path.getsize(csv_path) / (1024 * 1024)  # Size in MB
        print(f"DEBUG: CSV file size is {file_size:.2f} MB")
        
        # Load the CSV file
        print(f"DEBUG: Starting to read CSV with pandas")
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
        crime_data_cache = crime_data
        return crime_data
    
    except Exception as e:
        import traceback
        print(f"DEBUG ERROR: {str(e)}")
        print(traceback.format_exc())
        return []

@require_http_methods(["GET"])
def get_crime_data(request):
    """API endpoint to return pre-processed crime data for the map display"""
    try:
        # Load the crime data
        crime_data = load_crime_data()
        
        # Return the data
        return JsonResponse({"crimeData": crime_data})
    
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on earth"""
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r

def point_to_line_distance(px, py, x1, y1, x2, y2):
    """Calculate the shortest distance from a point to a line segment"""
    # Length of the line segment
    line_length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    
    # If the line segment has zero length, return the distance to either endpoint
    if line_length == 0:
        return math.sqrt((px - x1) ** 2 + (py - y1) ** 2)
    
    # Calculate the projection of the point onto the line segment
    t = max(0, min(1, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / (line_length ** 2)))
    
    # Get the closest point on the line segment
    closest_x = x1 + t * (x2 - x1)
    closest_y = y1 + t * (y2 - y1)
    
    # Return the distance to the closest point
    point_dist = math.sqrt((px - closest_x) ** 2 + (py - closest_y) ** 2)
    
    # Convert to approximate meters (rough but sufficient for our purpose)
    lat_factor = 111000  # meters per degree of latitude
    lng_factor = 111000 * math.cos(math.radians((y1 + y2) / 2))  # meters per degree of longitude
    
    return point_dist * math.sqrt((lat_factor ** 2 + lng_factor ** 2) / 2)

@require_http_methods(["POST"])
def check_route_safety(request):
    """API endpoint to check route safety based on pre-processed crime data"""
    try:
        data = json.loads(request.body)
        route_points = data.get('route', [])
        
        if not route_points or len(route_points) < 2:
            return JsonResponse({"error": "Invalid route data"}, status=400)
        
        # Cache key based on request parameters
        cache_key = f"route_safety:{hash(str(route_points))}"
        cached_result = cache.get(cache_key)
        
        if cached_result:
            return JsonResponse(cached_result)
        
        # Load crime data
        crime_data = load_crime_data()
        print(f"Checking route safety with {len(crime_data)} crime points")
        
        # Calculate safety for each route segment
        total_impact = 0
        route_length = 0
        crimes_near_route = 0
        
        for i in range(len(route_points) - 1):
            p1 = route_points[i]
            p2 = route_points[i + 1]
            
            # Calculate segment length
            segment_length = haversine_distance(p1['lat'], p1['lng'], p2['lat'], p2['lng'])
            route_length += segment_length
            
            # Check each crime point's impact on this segment
            # Use a spatial filter to reduce computation
            lat_min = min(p1['lat'], p2['lat']) - 0.005  # ~500m buffer
            lat_max = max(p1['lat'], p2['lat']) + 0.005
            lng_min = min(p1['lng'], p2['lng']) - 0.005
            lng_max = max(p1['lng'], p2['lng']) + 0.005
            
            # Filter crimes within the bounding box
            nearby_crimes = [
                c for c in crime_data 
                if lat_min <= c['lat'] <= lat_max and lng_min <= c['lng'] <= lng_max
            ]
            
            for crime in nearby_crimes:
                try:
                    distance = point_to_line_distance(
                        crime['lat'], crime['lng'],
                        p1['lat'], p1['lng'],
                        p2['lat'], p2['lng']
                    )
                    
                    # Only consider crimes within 200 meters of the route
                    if distance < 200:
                        crimes_near_route += 1
                        
                        # More reasonable impact calculation:
                        # - Normalize crime weight to prevent extreme values
                        # - Scale impact by distance (closer = higher impact)
                        # - Use a reasonable multiplier
                        normalized_weight = min(crime['weight'], 10) / 10  # Cap at 10, normalize to 0-1
                        distance_factor = (200 - distance) / 200
                        impact = distance_factor * normalized_weight * 1.5
                        total_impact += impact
                except Exception as e:
                    print(f"Error calculating distance: {e}")
                    continue
        
        # Calculate safety score with better normalization
        base_score = 100
        
        # Use a logarithmic scale to handle large numbers of crimes without reducing to 0
        if crimes_near_route > 0:
            # Calculate impact with diminishing returns for many crimes
            # This prevents routes from all getting 0 safety
            log_factor = 1 + math.log10(crimes_near_route) if crimes_near_route >= 10 else crimes_near_route / 10
            normalized_impact = min(total_impact * log_factor / 10, 100)
        else:
            normalized_impact = 0
        
        # Calculate final safety score (0-100)
        safety_score = max(0, base_score - normalized_impact)
        
        print(f"Route safety calculation: length={route_length:.2f}m, crimes_near={crimes_near_route}, " +
              f"total_impact={total_impact:.2f}, normalized_impact={normalized_impact:.2f}, " +
              f"safety_score={safety_score:.2f}")
        
        # Format safety category
        if safety_score >= 80:
            safety_category = "safe"
        elif safety_score >= 50:
            safety_category = "warning"
        else:
            safety_category = "danger"
        
        result = {
            "safetyScore": round(safety_score, 1),
            "safetyCategory": safety_category,
            "isSafe": safety_score >= 70,
            "affectingCrimeCount": crimes_near_route,
            "routeLength": route_length,
            "debugInfo": {
                "totalImpact": total_impact,
                "normalizedImpact": normalized_impact
            }
        }
        
        # Cache the result
        cache.set(cache_key, result, 60 * 30)  # Cache for 30 minutes
        
        return JsonResponse(result)
    
    except Exception as e:
        import traceback
        print(f"Error checking route safety: {str(e)}")
        print(traceback.format_exc())
        return JsonResponse({"error": str(e)}, status=500)