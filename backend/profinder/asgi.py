import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'profinder.settings')

# Initialise Django (and app registry) before importing anything that touches
# models or settings — Channels routing/consumers do.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from channels.auth import AuthMiddlewareStack  # noqa: E402
from channels.security.websocket import (  # noqa: E402
    AllowedHostsOriginValidator,
    OriginValidator,
)
from django.conf import settings  # noqa: E402

import chat.routing  # noqa: E402

inner_application = AuthMiddlewareStack(
    URLRouter(chat.routing.websocket_urlpatterns)
)

# The web client is typically served from a different origin than this API, so
# AllowedHostsOriginValidator (which only trusts our own host) would reject it.
# Trust the same origins we allow for CORS, plus any explicit overrides.
_extra = [o.strip() for o in os.environ.get('WS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
_allowed_origins = list(settings.CORS_ALLOWED_ORIGINS) + list(settings.CSRF_TRUSTED_ORIGINS) + _extra

if settings.CORS_ALLOW_ALL_ORIGINS or '*' in _extra:
    websocket_application = OriginValidator(inner_application, ['*'])
elif _allowed_origins:
    websocket_application = OriginValidator(inner_application, _allowed_origins)
else:
    websocket_application = AllowedHostsOriginValidator(inner_application)

application = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': websocket_application,
})
