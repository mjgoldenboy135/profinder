from django.db import migrations


def mark_existing_verified(apps, schema_editor):
    # Grandfather accounts that existed before email verification was added so
    # enabling verification later doesn't lock them out. Only new signups will
    # need to verify.
    User = apps.get_model('users', 'User')
    User.objects.update(email_verified=True)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_email_verified'),
    ]

    operations = [
        migrations.RunPython(mark_existing_verified, noop),
    ]
