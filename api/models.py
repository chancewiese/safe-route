# api/models.py
# This file will contain SQLAlchemy ORM models for database tables:

# CrimeData model:
# - id (primary key)
# - lat, lng (coordinates with indexes for spatial queries)
# - weight (crime severity/frequency)
# - crime_type (optional categorization)
# - description (optional details)
# - date_occurred (when crime happened)
# - created_at, updated_at (record timestamps)

# RouteHistory model:
# - id (primary key)
# - start_lat, start_lng, end_lat, end_lng (route endpoints)
# - safety_score (calculated safety rating)
# - route_length (distance)
# - affecting_crime_count (number of crimes near route)
# - created_at (when route was calculated)

# Additional models could include:
# - User preferences
# - Route alternatives
# - Crime statistics cache