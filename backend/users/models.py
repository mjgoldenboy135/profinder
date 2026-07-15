from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
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

    AVAILABILITY_CHOICES = [
        ('none', 'Not specified'),
        ('open_to_work', 'Open to work'),
        ('hiring', 'Hiring'),
        ('networking', 'Networking'),
        ('mentoring', 'Open to mentoring'),
        ('collaborating', 'Open to collaborate'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    full_name = models.CharField(max_length=255)
    profession = models.CharField(max_length=255, blank=True, default='')
    company = models.CharField(max_length=150, blank=True, default='')
    education = models.CharField(max_length=500, blank=True, default='')
    professional_details = models.TextField(blank=True, default='')
    years_of_experience = models.IntegerField(null=True, blank=True)
    linkedin_profile_url = models.URLField(blank=True, default='')
    phone_number = models.CharField(max_length=50, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    interests = models.JSONField(default=list, blank=True)
    profile_picture = models.ImageField(upload_to='profile_pictures/', null=True, blank=True)
    # Processed avatar stored in the DB so it survives redeploys on hosts with
    # ephemeral disks (e.g. Render free tier) and is served via a public view.
    profile_picture_data = models.BinaryField(null=True, blank=True, editable=False)
    profile_picture_content_type = models.CharField(max_length=50, blank=True, default='')
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
    availability = models.CharField(
        max_length=20, choices=AVAILABILITY_CHOICES, default='none'
    )
    favorites = models.ManyToManyField('self', symmetrical=False, blank=True, related_name='favorited_by')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.user.email})"

    def get_picture_url(self, request=None):
        """Absolute URL for the avatar, or None. Includes a cache-busting
        version so the browser refetches after the picture changes."""
        if self.profile_picture_data:
            version = int(self.updated_at.timestamp()) if self.updated_at else 0
            path = f'/api/users/{self.user_id}/picture/?v={version}'
            return request.build_absolute_uri(path) if request else path
        if self.profile_picture:
            try:
                url = self.profile_picture.url
                return request.build_absolute_uri(url) if request else url
            except Exception:
                return None
        return None


class BlockedUser(models.Model):
    """`blocker` has blocked `blocked`: hide each from the other and stop
    messaging between them."""
    blocker = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocks_made')
    blocked = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f"{self.blocker_id} blocked {self.blocked_id}"


class Report(models.Model):
    REASON_CHOICES = [
        ('spam', 'Spam or advertising'),
        ('harassment', 'Harassment or abuse'),
        ('inappropriate', 'Inappropriate content'),
        ('fake', 'Fake profile or impersonation'),
        ('scam', 'Scam or fraud'),
        ('other', 'Other'),
    ]
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    reported = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report {self.reason} by {self.reporter_id} on {self.reported_id}"
