# Profinder Django Backend

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your settings
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

The dev server runs an ASGI stack (Daphne) so WebSocket chat works locally too.

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `SECRET_KEY`: Django secret key
- `DEBUG`: True for development, False in production
- `ALLOWED_HOSTS`: Comma-separated hostnames
- `DATABASE_URL`: SQLite (default) or PostgreSQL URL
- `CORS_ALLOWED_ORIGINS`: Frontend URLs allowed to call the REST API
- `WS_ALLOWED_ORIGINS`: Extra origins allowed to open the chat WebSocket
  (falls back to `CORS_ALLOWED_ORIGINS` when empty)
- `CSRF_TRUSTED_ORIGINS`: Trusted HTTPS origins for CSRF

## API Endpoints

- `GET /api/health/` - Health check (used by Render)
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login, returns JWT tokens
- `POST /api/auth/google/` - Sign in/up with a Google ID token (set `GOOGLE_CLIENT_ID`)
- `POST /api/auth/verify-email/` - Confirm an email-verification link (uid, token)
- `POST /api/auth/resend-verification/` - Resend the verification email
- `POST /api/auth/change-password/` - Change password (authenticated)
- `POST /api/auth/password-reset/` - Request a password-reset email
- `POST /api/auth/password-reset-confirm/` - Set a new password from a reset link
- `POST /api/auth/token/refresh/` - Refresh access token
- `POST /api/auth/online/` - Set online status
- `GET/PUT /api/users/me/` - Own profile (PUT updates lat/lng for the map)
- `POST /api/users/me/picture/` - Upload profile picture
- `GET /api/users/` - List users (supports ?search=, ?profession=, ?online=true, ?has_location=true)
- `GET /api/users/<id>/` - Public user profile
- `GET/POST /api/users/me/favorites/` - Manage favorites
- `GET/POST /api/chats/` - List/create chats
- `GET/DELETE /api/chats/<id>/` - Chat detail/hide
- `GET/POST /api/chats/<id>/messages/` - Messages (POST broadcasts over WebSocket)
- `WS /ws/chat/<id>/?token=<jwt>` - Real-time WebSocket

## Deploy to Render

A `render.yaml` blueprint lives at the repository root. On https://render.com,
create a new **Blueprint** and point it at this repo — it provisions a
PostgreSQL database and a Python web service that runs:

```
build:  ./build.sh                 # installs deps, collectstatic, migrate
start:  daphne -b 0.0.0.0 -p $PORT profinder.asgi:application
```

`SECRET_KEY` is auto-generated and `DATABASE_URL` is wired from the database.
After the frontend is deployed, set `CORS_ALLOWED_ORIGINS` (and, if different,
`WS_ALLOWED_ORIGINS`) on the service to the frontend's origin, then point the
frontend's `NEXT_PUBLIC_API_URL` at `https://<your-service>.onrender.com/api`.

### Notes on scaling

Chat uses an in-memory channel layer, so the service runs as a single Daphne
process (one instance). That is fine for the free plan; to run multiple
instances, add Redis and switch `CHANNEL_LAYERS` to `channels_redis`. Uploaded
media lives on the instance's ephemeral disk — attach a Render persistent disk
(or object storage) if profile pictures must survive redeploys.
