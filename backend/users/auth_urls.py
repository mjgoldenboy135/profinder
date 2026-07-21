from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .auth_views import (
    LoginView, RegisterView, SetOnlineView, GoogleLoginView,
    ChangePasswordView, PasswordResetRequestView, PasswordResetConfirmView,
    VerifyEmailView, ResendVerificationView, SendVerificationView,
)

urlpatterns = [
    path('register/', RegisterView.as_view()),
    path('login/', LoginView.as_view()),
    path('google/', GoogleLoginView.as_view()),
    path('verify-email/', VerifyEmailView.as_view()),
    path('resend-verification/', ResendVerificationView.as_view()),
    path('send-verification/', SendVerificationView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('online/', SetOnlineView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
    path('password-reset/', PasswordResetRequestView.as_view()),
    path('password-reset-confirm/', PasswordResetConfirmView.as_view()),
]
