from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from .models import UserProfile
from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, username=email, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials.'}, status=status.HTTP_401_UNAUTHORIZED)
        refresh = RefreshToken.for_user(user)
        try:
            profile = user.profile
            serializer = UserProfileSerializer(profile, context={'request': request})
            profile_data = serializer.data
        except UserProfile.DoesNotExist:
            profile_data = None
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': profile_data,
        })


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        try:
            profile = user.profile
            profile_serializer = UserProfileSerializer(profile, context={'request': request})
            profile_data = profile_serializer.data
        except UserProfile.DoesNotExist:
            profile_data = None
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': profile_data,
        }, status=status.HTTP_201_CREATED)


class SetOnlineView(APIView):
    def post(self, request):
        is_online = request.data.get('is_online', True)
        try:
            profile = request.user.profile
            profile.is_online = is_online
            profile.save(update_fields=['is_online'])
        except UserProfile.DoesNotExist:
            pass
        return Response({'is_online': is_online})


class ChangePasswordView(APIView):
    """Authenticated user changes their own password."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password') or ''
        new_password = request.data.get('new_password') or ''
        if not request.user.check_password(old_password):
            return Response({'detail': 'Current password is incorrect.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=request.user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)},
                            status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        return Response({'message': 'Password changed successfully.'})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        # Always respond the same way so we don't leak which emails exist.
        generic = Response({'message': 'If an account exists, a reset email was sent.'})
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return generic

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password?uid={uid}&token={token}"
        try:
            send_mail(
                subject='Reset your Profinder password',
                message=(
                    'We received a request to reset your Profinder password.\n\n'
                    f'Reset it here: {reset_link}\n\n'
                    "If you didn't request this, you can ignore this email."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass
        return generic


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        uid = request.data.get('uid', '')
        token = request.data.get('token', '')
        new_password = request.data.get('new_password') or ''
        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({'detail': 'Invalid or expired reset link.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if not default_token_generator.check_token(user, token):
            return Response({'detail': 'Invalid or expired reset link.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            return Response({'detail': ' '.join(exc.messages)},
                            status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Password has been reset. You can now log in.'})
