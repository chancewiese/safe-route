# api/services/route_safety.py
import math
from typing import List, Dict, Any
from services.crime_data import get_crime_data_service

def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on earth (in meters)"""
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
    """Calculate the shortest distance from a point to a line segment (in meters)"""
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

def check_route_safety_service(route_points: List[Dict[str, float]]) -> Dict[str, Any]:
    """Calculate safety score for a route"""
    # Load crime data
    crime_data = get_crime_data_service()
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
                if distance < 100:
                    crimes_near_route += 1
                    
                    # Impact calculation:
                    MAX_OBSERVED_WEIGHT = 4198
                    normalized_weight = math.sqrt(min(crime['weight'], MAX_OBSERVED_WEIGHT)) / math.sqrt(MAX_OBSERVED_WEIGHT)  # Cap at 10, normalize to 0-1
                    distance_factor = max(0, 1 - (distance / 100))  # Closer crimes have higher impact
                    impact = distance_factor * normalized_weight * 0.2  
                    total_impact += impact 
            except Exception as e:
                print(f"Error calculating distance: {e}")
                continue
    
    # Calculate safety score
    base_score = 100
    
    # Use a logarithmic scale for diminishing returns with many crimes
    if crimes_near_route > 0:
        crime_factor = math.sqrt(crimes_near_route) / 5
        # Divide by a larger value to reduce overall impact
        normalized_impact = min(total_impact * crime_factor, 90)
    else:
        normalized_impact = 0
    
    # Calculate final safety score (0-100)
    safety_score = max(10, base_score - normalized_impact)
    
    # Format safety category
    if safety_score >= 70: 
        safety_category = "safe"
    elif safety_score >= 40:
        safety_category = "warning"
    else:
        safety_category = "danger"
    
    return {
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