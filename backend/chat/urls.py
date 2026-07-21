from django.urls import path
from .views import ChatListView, ChatDetailView, MessageListView, MarkChatReadView

urlpatterns = [
    path('chats/', ChatListView.as_view()),
    path('chats/<int:pk>/', ChatDetailView.as_view()),
    path('chats/<int:pk>/messages/', MessageListView.as_view()),
    path('chats/<int:pk>/read/', MarkChatReadView.as_view()),
]
