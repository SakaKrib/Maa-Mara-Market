#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

python manage.py collectstatic --noinput
python manage.py migrate --noinput

exec python -m daphne \
  --bind 0.0.0.0 \
  --port 8000 \
  project01.asgi:application
