import io

from rest_framework import generics, status, permissions
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import HttpResponse, Http404
from django.views.decorators.cache import cache_control
from PIL import Image, ImageOps, UnidentifiedImageError
from .models import UserProfile
from .serializers import RegisterSerializer, UserProfileSerializer, PublicUserProfileSerializer

User = get_user_model()

AVATAR_SIZE = 400  # square avatars, AVATAR_SIZE x AVATAR_SIZE


def process_avatar(uploaded_file):
    """Auto-orient, center-crop to a square, and resize to a fixed dimension.
    Returns JPEG bytes. Raises ValueError if the file isn't a valid image."""
    try:
        img = Image.open(uploaded_file)
        img.load()
    except (UnidentifiedImageError, OSError, ValueError):
        raise ValueError('Invalid or unsupported image file.')
    img = ImageOps.exif_transpose(img)  # respect camera orientation
    if img.mode != 'RGB':
        img = img.convert('RGB')
    # ImageOps.fit center-crops to the target aspect ratio then resizes.
    img = ImageOps.fit(img, (AVATAR_SIZE, AVATAR_SIZE), Image.LANCZOS)
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85, optimize=True)
    return buffer.getvalue()


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

    def delete(self, request):
        """Permanently delete the logged-in user's own account."""
        from chat.models import Chat

        user = request.user
        # Remove conversations the user was part of so no orphaned
        # single-participant chats linger for the other person.
        Chat.objects.filter(participants=user).delete()
        user.delete()  # cascades to profile, messages, favorites
        return Response({'message': 'Account deleted permanently.'})


@api_view(['POST', 'DELETE'])
@parser_classes([MultiPartParser, FormParser])
def upload_profile_picture(request):
    try:
        profile = request.user.profile
    except UserProfile.DoesNotExist:
        return Response({'detail': 'Profile not found.'}, status=404)

    if request.method == 'DELETE':
        profile.profile_picture_data = None
        profile.profile_picture_content_type = ''
        profile.profile_picture = None
        profile.save(update_fields=[
            'profile_picture_data', 'profile_picture_content_type',
            'profile_picture', 'updated_at',
        ])
        return Response({'profile_picture_url': None})

    if 'picture' not in request.FILES:
        return Response({'detail': 'No picture provided.'}, status=400)
    try:
        data = process_avatar(request.FILES['picture'])
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=400)
    profile.profile_picture_data = data
    profile.profile_picture_content_type = 'image/jpeg'
    # Clear any legacy file-based picture so the DB copy is authoritative.
    profile.profile_picture = None
    profile.save(update_fields=[
        'profile_picture_data', 'profile_picture_content_type',
        'profile_picture', 'updated_at',
    ])
    return Response({'profile_picture_url': profile.get_picture_url(request)})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
@cache_control(public=True, max_age=3600)
def serve_profile_picture(request, pk):
    """Public endpoint that serves an avatar so plain <img> tags (which can't
    send an Authorization header) can load it."""
    profile = generics.get_object_or_404(UserProfile, user__id=pk)
    if not profile.profile_picture_data:
        raise Http404('No picture.')
    content_type = profile.profile_picture_content_type or 'image/jpeg'
    return HttpResponse(bytes(profile.profile_picture_data), content_type=content_type)


def blocked_user_ids(user):
    """Ids the given user shouldn't see: people they blocked AND people who
    blocked them (blocking is bidirectional for visibility)."""
    from .models import BlockedUser
    made = BlockedUser.objects.filter(blocker=user).values_list('blocked_id', flat=True)
    got = BlockedUser.objects.filter(blocked=user).values_list('blocker_id', flat=True)
    return set(made) | set(got)


class UserListView(generics.ListAPIView):
    serializer_class = PublicUserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = UserProfile.objects.select_related('user').exclude(user=self.request.user)
        # Hide anyone involved in a block relationship with me, both directions.
        qs = qs.exclude(user_id__in=blocked_user_ids(self.request.user))

        search = self.request.query_params.get('search')
        profession = self.request.query_params.get('profession')
        online = self.request.query_params.get('online')
        has_location = self.request.query_params.get('has_location')
        availability = self.request.query_params.get('availability')

        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(profession__icontains=search) |
                Q(company__icontains=search) |
                Q(bio__icontains=search)
            )
        if profession:
            qs = qs.filter(profession__icontains=profession)
        if online == 'true':
            qs = qs.filter(is_online=True)
        if has_location == 'true':
            qs = qs.filter(lat__isnull=False, lng__isnull=False)
        if availability and availability != 'none':
            qs = qs.filter(availability=availability)
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


class BlockView(APIView):
    """POST /api/users/<id>/block/ to block, DELETE to unblock."""
    def post(self, request, pk):
        from .models import BlockedUser
        if str(pk) == str(request.user.id):
            return Response({'detail': "You can't block yourself."}, status=400)
        target = generics.get_object_or_404(User, id=pk)
        BlockedUser.objects.get_or_create(blocker=request.user, blocked=target)
        # A block also removes any favorite link between the two.
        try:
            request.user.profile.favorites.remove(target.profile)
            target.profile.favorites.remove(request.user.profile)
        except UserProfile.DoesNotExist:
            pass
        return Response({'message': 'User blocked.', 'blocked': True})

    def delete(self, request, pk):
        from .models import BlockedUser
        BlockedUser.objects.filter(blocker=request.user, blocked_id=pk).delete()
        return Response({'message': 'User unblocked.', 'blocked': False})


class BlockedListView(APIView):
    """GET /api/users/me/blocked/ — profiles the current user has blocked."""
    def get(self, request):
        from .models import BlockedUser
        blocked_ids = BlockedUser.objects.filter(blocker=request.user).values_list('blocked_id', flat=True)
        profiles = UserProfile.objects.select_related('user').filter(user_id__in=blocked_ids)
        serializer = PublicUserProfileSerializer(profiles, many=True, context={'request': request})
        return Response(serializer.data)


class ReportView(APIView):
    """POST /api/users/<id>/report/ with {reason, details}."""
    def post(self, request, pk):
        from .models import Report
        if str(pk) == str(request.user.id):
            return Response({'detail': "You can't report yourself."}, status=400)
        target = generics.get_object_or_404(User, id=pk)
        reason = request.data.get('reason', 'other')
        valid = {c[0] for c in Report.REASON_CHOICES}
        if reason not in valid:
            reason = 'other'
        details = (request.data.get('details') or '')[:2000]
        Report.objects.create(reporter=request.user, reported=target, reason=reason, details=details)
        return Response({'message': 'Thank you. Your report has been submitted.'}, status=201)
