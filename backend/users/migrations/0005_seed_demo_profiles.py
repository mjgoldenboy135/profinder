from django.contrib.auth.hashers import make_password
from django.db import migrations

from users import seed_data


def forwards(apps, schema_editor):
    User = apps.get_model('users', 'User')
    UserProfile = apps.get_model('users', 'UserProfile')
    seed_data.seed_profiles(User, UserProfile, make_password(seed_data.DEMO_PASSWORD))


def backwards(apps, schema_editor):
    User = apps.get_model('users', 'User')
    User.objects.filter(email__iendswith=seed_data.DEMO_EMAIL_DOMAIN).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_verify_existing_users'),
    ]

    operations = [
        migrations.RunPython(forwards, backwards),
    ]
