#!/usr/bin/env bash
# Render build script for the Profinder Django backend.
set -o errexit

pip install -r requirements.txt

mkdir -p media/profile_pictures
python manage.py collectstatic --no-input
python manage.py migrate
