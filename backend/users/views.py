from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import UserProfile
from .serializers import RegisterSerializer, UserProfileSerializer, PublicUserProfileSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({'message': 'Account created successfully.'}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    def get(self, request):
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, context={'request': request})
            return Response(serializer.data)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)

    def put(self, request):
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_picture(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        return Response({'detail': 'Profile not found.'}, status=404)
    if 'picture' not in request.FILES:
        return Response({'detail': 'No picture provided.'}, status=400)
    profile.profile_picture = request.FILES['picture']
    profile.save()
    serializer = UserProfileSerializer(profile, context={'request': request})
    return Response({'profile_picture_url': serializer.data['profile_picture_url']})


class UserListView(generics.ListAPIView):
    serializer_class = PublicUserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = UserProfile.objects.select_related('user').all()
        search = self.request.query_params.get('search')
        profession = self.request.query_params.get('profession')
        online = self.request.query_params.get('online')
        has_location = self.request.query_params.get('has_location')

        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(profession__icontains=search) |
                Q(bio__icontains=search)
            )
        if profession:
            qs = qs.filter(profession__icontains=profession)
        if online == 'true':
            qs = qs.filter(is_online=True)
        if has_location == 'true':
            qs = qs.filter(lat__isnull=False, lng__isnull=False)
        return qs


class UserDetailView(generics.RetrieveAPIView):
    serializer_class = PublicUserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user_id = self.kwargs['pk']
        return generics.get_object_or_404(UserProfile, user__id=user_id)


class FavoritesView(APIView):
    def get(self, request):
        profile = request.user.profile
        favorites = profile.favorites.select_related('user').all()
        serializer = PublicUserProfileSerializer(favorites, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        profile = request.user.profile
        target = generics.get_object_or_404(UserProfile, user__id=pk)
        profile.favorites.add(target)
        return Response({'message': 'Added to favorites.'})

    def delete(self, request, pk):
        profile = request.user.profile
        target = generics.get_object_or_404(UserProfile, user__id=pk)
        profile.favorites.remove(target)
        return Response({'message': 'Removed from favorites.'})
