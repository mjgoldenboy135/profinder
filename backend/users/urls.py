from django.urls import path
from .views import MeView, UserListView, UserDetailView, FavoritesView, upload_profile_picture

urlpatterns = [
    path('users/me/', MeView.as_view()),
    path('users/me/picture/', upload_profile_picture),
    path('users/me/favorites/', FavoritesView.as_view()),
    path('users/me/favorites/<int:pk>/', FavoritesView.as_view()),
    path('users/', UserListView.as_view()),
    path('users/<int:pk>/', UserDetailView.as_view()),
]
