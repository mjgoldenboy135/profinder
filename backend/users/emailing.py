"""Email delivery helpers.

Render's free tier blocks all outbound SMTP ports (25/465/587), so SMTP hangs
until the worker is killed. BrevoApiBackend sends over HTTPS instead (not
blocked), and send_email_async fires every send in a background thread so an
HTTP request never blocks on email delivery.
"""
import logging
import threading
from email.utils import parseaddr

from django.conf import settings
from django.core.mail import send_mail
from django.core.mail.backends.base import BaseEmailBackend

logger = logging.getLogger(__name__)

BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'


class BrevoApiBackend(BaseEmailBackend):
    """Django email backend that delivers via Brevo's HTTPS API."""

    def send_messages(self, email_messages):
        import requests  # local import; only needed when this backend is active

        sent = 0
        for message in email_messages:
            try:
                name, addr = parseaddr(message.from_email or settings.DEFAULT_FROM_EMAIL)
                payload = {
                    'sender': {'email': addr, 'name': name or 'Profinder'},
                    'to': [{'email': recipient} for recipient in message.to],
                    'subject': message.subject,
                    'textContent': message.body,
                }
                response = requests.post(
                    BREVO_API_URL,
                    json=payload,
                    headers={
                        'api-key': settings.BREVO_API_KEY,
                        'accept': 'application/json',
                    },
                    timeout=getattr(settings, 'EMAIL_TIMEOUT', 10),
                )
                if response.status_code in (200, 201, 202):
                    sent += 1
                else:
                    logger.warning('Brevo send failed (%s): %s',
                                   response.status_code, response.text[:300])
                    if not self.fail_silently:
                        raise RuntimeError(
                            f'Brevo API error {response.status_code}: {response.text[:300]}'
                        )
            except Exception:
                logger.exception('Error sending email via Brevo')
                if not self.fail_silently:
                    raise
        return sent


def send_email_async(subject, message, recipient_list, from_email=None):
    """Send an email without blocking the request that triggered it."""
    def _send():
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=from_email or settings.DEFAULT_FROM_EMAIL,
                recipient_list=recipient_list,
                fail_silently=True,
            )
        except Exception:
            logger.exception('Async email send failed')

    threading.Thread(target=_send, daemon=True).start()
