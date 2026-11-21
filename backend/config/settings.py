"""Local development settings for the invitation."""

import os
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
