#!/usr/bin/env bash

# Collect static files into STATIC_ROOT (django settings file)
python manage.py collectstatic --noinput

# Update databases
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Start daphne, an ASGI server, which will handle data transfer between the django app and the web server (nginx)
python -m daphne \
   --bind 0.0.0.0 \
   --port 8000 \
   project01.asgi:application
