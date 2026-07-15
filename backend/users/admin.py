from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, BlockedUser, Report

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'is_active', 'date_joined']
    ordering = ['email']

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'user', 'profession', 'availability', 'is_online', 'created_at']
    search_fields = ['full_name', 'user__email', 'profession']

@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ['blocker', 'blocked', 'created_at']
    search_fields = ['blocker__email', 'blocked__email']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['reported', 'reason', 'reporter', 'created_at']
    list_filter = ['reason', 'created_at']
    search_fields = ['reported__email', 'reporter__email', 'details']
