from django.contrib import admin
from django.urls import path, re_path, include
from django.views.generic import TemplateView
from saferouteapp.views import health_check
from saferouteapp.api import get_crime_data, check_route_safety

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API endpoints
    path('api/crime-data/', get_crime_data, name='crime_data'),
    path('api/check-route/', check_route_safety, name='check_route'),
    
    # Health check endpoint
    path('api/health/', health_check, name='health_check'),
    
    # Serve React app for all other routes
    re_path(r'^$', TemplateView.as_view(template_name='index.html')),
    re_path(r'^(?:.*)/?$', TemplateView.as_view(template_name='index.html')),
]