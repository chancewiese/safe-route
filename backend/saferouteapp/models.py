from django.db import models

class SavedRoute(models.Model):
    """Model for storing user saved routes"""
    name = models.CharField(max_length=255)
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    start_lat = models.FloatField()
    start_lng = models.FloatField()
    end_lat = models.FloatField()
    end_lng = models.FloatField()
    safety_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.name}: {self.start_location} to {self.end_location}"