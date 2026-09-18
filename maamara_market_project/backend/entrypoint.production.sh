#!/usr/bin/env bash
set -e

# Run from the backend directory so Django can resolve project01 and installed apps.
cd "$(dirname "$0")"

# Collect static files into STATIC_ROOT
python manage.py collectstatic --noinput

# Update database schema
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Start Daphne ASGI server
python -m daphne \
   --bind 0.0.0.0 \
   --port 8000 \
   project01.asgi:application
