FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim-bookworm
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DJANGO_SETTINGS_MODULE=config.production
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
RUN DJANGO_SECRET_KEY=build-only RAILWAY_PUBLIC_DOMAIN=build.invalid RSVP_PRIVATE_ROOT=/tmp/private PGHOST=localhost PGDATABASE=build PGUSER=build PGPASSWORD=build python manage.py collectstatic --noinput
CMD ["sh", "-c", ": ${RAILWAY_VOLUME_MOUNT_PATH:?Attach a persistent volume before starting}; export RSVP_PRIVATE_ROOT=${RAILWAY_VOLUME_MOUNT_PATH}/uploads; mkdir -p \"$RSVP_PRIVATE_ROOT\" && python manage.py migrate --noinput && exec gunicorn config.wsgi:application --bind 0.0.0.0:${PORT:-8000} --timeout 180"]
