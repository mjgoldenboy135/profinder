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

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `SECRET_KEY`: Django secret key
- `DEBUG`: True for development
- `DATABASE_URL`: SQLite (default) or PostgreSQL URL
- `CORS_ALLOWED_ORIGINS`: Frontend URLs

## API Endpoints

- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login, returns JWT tokens
- `POST /api/auth/token/refresh/` - Refresh access token
- `GET/PUT /api/users/me/` - Own profile
- `POST /api/users/me/picture/` - Upload profile picture
- `GET /api/users/` - List users (supports ?search=, ?profession=, ?online=true)
- `GET /api/users/<id>/` - Public user profile
- `GET/POST /api/users/me/favorites/` - Manage favorites
- `GET/POST /api/chats/` - List/create chats
- `GET/DELETE /api/chats/<id>/` - Chat detail/hide
- `GET/POST /api/chats/<id>/messages/` - Messages
- `WS /ws/chat/<id>/?token=<jwt>` - Real-time WebSocket
