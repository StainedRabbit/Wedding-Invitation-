from django.contrib import admin
from django.http import HttpResponse
from django.urls import path
from rsvp import views as rsvp_views


def index(request):
    return HttpResponse("Our Next Chapter development server", content_type="text/plain")


urlpatterns = [
    path("", index),
    path("admin/", admin.site.urls),
    path("api/rsvp/context/", rsvp_views.context),
    path("api/rsvp/responses/", rsvp_views.submit),
]
