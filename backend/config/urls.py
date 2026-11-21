from django.contrib import admin
from django.conf import settings
from django.http import FileResponse, HttpResponse, JsonResponse
from django.db import connection
from django.urls import path
from rsvp import views as rsvp_views


def index(request):
    if not settings.DEBUG:
        return FileResponse((settings.BASE_DIR.parent / "frontend" / "dist" / "index.html").open("rb"), content_type="text/html")
    return HttpResponse("Our Next Chapter development server", content_type="text/plain")


def health(request):
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("", index),
    path("health/", health),
    path("admin/", admin.site.urls),
    path("api/rsvp/context/", rsvp_views.context),
    path("api/rsvp/responses/", rsvp_views.submit),
]
