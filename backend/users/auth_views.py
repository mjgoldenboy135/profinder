from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
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
            update_fields = ['is_online']
            if 'lat' in request.data:
                profile.lat = request.data['lat']
                update_fields.append('lat')
            if 'lng' in request.data:
                profile.lng = request.data['lng']
                update_fields.append('lng')
            if 'address' in request.data:
                profile.address = request.data['address']
                update_fields.append('address')
            profile.save(update_fields=update_fields)
        except UserProfile.DoesNotExist:
            pass
        return Response({'is_online': is_online})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # Placeholder - in production, send reset email
        return Response({'message': 'If an account exists, a reset email was sent.'})
