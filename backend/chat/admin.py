from django.contrib import admin
from .models import Chat, Message, HiddenChat

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['id', 'last_message_text', 'last_message_at', 'updated_at']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chat', 'sender', 'receiver', 'status', 'created_at']

@admin.register(HiddenChat)
class HiddenChatAdmin(admin.ModelAdmin):
    list_display = ['user', 'chat', 'hidden_at']
