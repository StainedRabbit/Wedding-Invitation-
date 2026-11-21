"""Local development settings for the invitation."""

import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = "local-development-only"
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"] + [
    host.strip() for host in os.environ.get("RSVP_ALLOWED_HOSTS", "").split(",") if host.strip()
]
ROOT_URLCONF = "config.urls"
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rsvp",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
credentials_path = BASE_DIR / ".postgres-credentials.json"
database_mode = os.environ.get(
    "RSVP_DATABASE", "postgres" if (BASE_DIR / ".use-postgres").is_file() else "sqlite"
)
if database_mode == "postgres":
    if credentials_path.is_file():
        with credentials_path.open(encoding="utf-8") as credentials_file:
            postgres_credentials = json.load(credentials_file)
    else:
        postgres_credentials = {}
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": os.environ.get("PGDATABASE", postgres_credentials.get("name", "our_next_chapter")),
            "USER": os.environ.get("PGUSER", postgres_credentials.get("user", "our_next_chapter")),
            "PASSWORD": os.environ.get("PGPASSWORD", postgres_credentials.get("password", "")),
            "HOST": os.environ.get("PGHOST", postgres_credentials.get("host", "127.0.0.1")),
            "PORT": os.environ.get("PGPORT", postgres_credentials.get("port", "5432")),
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
            "OPTIONS": {"transaction_mode": "IMMEDIATE", "timeout": 20},
        }
    }
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
RSVP_INVITATION_ORIGIN = os.environ.get("RSVP_INVITATION_ORIGIN", "http://localhost:5173").rstrip("/")
RSVP_PRIVATE_ROOT = Path(os.environ.get("RSVP_PRIVATE_ROOT", BASE_DIR / "private_uploads"))
local_ffprobe = BASE_DIR.parent / "tools" / "ffmpeg" / "ffmpeg-9.1-full_build" / "bin" / "ffprobe.exe"
try:
    default_ffprobe = str(local_ffprobe) if local_ffprobe.is_file() else "ffprobe"
except OSError:
    default_ffprobe = "ffprobe"
RSVP_FFPROBE = os.environ.get("RSVP_FFPROBE", default_ffprobe)
DATA_UPLOAD_MAX_NUMBER_FILES = None
FILE_UPLOAD_HANDLERS = ["django.core.files.uploadhandler.TemporaryFileUploadHandler"]
USE_TZ = True
