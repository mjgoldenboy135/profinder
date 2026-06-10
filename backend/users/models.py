from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users_user'


class UserProfile(models.Model):
    LOCATION_VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('favorites', 'Favorites Only'),
        ('none', 'Nobody'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255)
    profession = models.CharField(max_length=255, blank=True, default='')
    education = models.CharField(max_length=500, blank=True, default='')
    professional_details = models.TextField(blank=True, default='')
    years_of_experience = models.IntegerField(null=True, blank=True)
    linkedin_profile_url = models.URLField(blank=True, default='')
    phone_number = models.CharField(max_length=50, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    interests = models.JSONField(default=list, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)
    address = models.CharField(max_length=500, blank=True, default='')
    is_online = models.BooleanField(default=False)
    location_visibility = models.CharField(
        max_length=20,
        choices=LOCATION_VISIBILITY_CHOICES,
        default='public'
    )
    show_contact = models.BooleanField(default=True)
    favorites = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.user.email})"
