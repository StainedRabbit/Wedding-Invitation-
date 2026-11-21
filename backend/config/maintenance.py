import os

from django.http import HttpResponse


class MaintenanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if os.environ.get("RSVP_MAINTENANCE") == "1" and request.path != "/health/":
            return HttpResponse("The invitation is being prepared. Please try again shortly.", status=503)
        return self.get_response(request)
