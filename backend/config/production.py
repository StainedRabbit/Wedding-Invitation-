"""Railway production settings. Required secrets are supplied by the service."""
import os
from pathlib import Path

from .settings import *  # noqa: F403

SECRET_KEY = os.environ["DJANGO_SECRET_KEY"]
DEBUG = False
public_domain = os.environ["RAILWAY_PUBLIC_DOMAIN"]
ALLOWED_HOSTS = [public_domain]
extra_hosts = os.environ.get("DJANGO_ALLOWED_HOSTS", "")
ALLOWED_HOSTS += [host.strip() for host in extra_hosts.split(",") if host.strip()]
MIDDLEWARE.insert(1, "whitenoise.middleware.WhiteNoiseMiddleware")  # noqa: F405
MIDDLEWARE.insert(1, "config.maintenance.MaintenanceMiddleware")  # noqa: F405
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # noqa: F405
WHITENOISE_ROOT = BASE_DIR.parent / "frontend" / "dist"  # noqa: F405
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_REDIRECT_EXEMPT = [r"^health/$"]
SECURE_HSTS_SECONDS = 3600
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["PGDATABASE"],
        "USER": os.environ["PGUSER"],
        "PASSWORD": os.environ["PGPASSWORD"],
        "HOST": os.environ["PGHOST"],
        "PORT": os.environ.get("PGPORT", "5432"),
    }
}
RSVP_PRIVATE_ROOT = Path(os.environ["RSVP_PRIVATE_ROOT"])
RSVP_INVITATION_ORIGIN = os.environ.get("RSVP_INVITATION_ORIGIN", f"https://{public_domain}").rstrip("/")
