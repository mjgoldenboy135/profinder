from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand

from users import seed_data
from users.models import UserProfile


class Command(BaseCommand):
    help = 'Create the 20 mock professional profiles (idempotent).'

    def handle(self, *args, **options):
        User = get_user_model()
        created = seed_data.seed_profiles(
            User, UserProfile, make_password(seed_data.DEMO_PASSWORD), stdout=self.stdout
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created {created} demo profiles.'))
        else:
            self.stdout.write('All demo profiles already exist. Nothing to do.')
