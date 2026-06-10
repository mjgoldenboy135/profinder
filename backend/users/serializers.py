from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['email', 'password', 'full_name']

    def create(self, validated_data):
        full_name = validated_data.pop('full_name')
        password = validated_data.pop('password')
        user = User(
            email=validated_data['email'],
            username=validated_data['email'],
        )
        user.set_password(password)
        user.save()
        UserProfile.objects.create(user=user, full_name=full_name)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    id = serializers.IntegerField(source='user.id', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'full_name', 'profession', 'education',
            'professional_details', 'years_of_experience', 'linkedin_profile_url',
            'phone_number', 'bio', 'interests', 'profile_picture_url',
            'lat', 'lng', 'address', 'is_online',
            'location_visibility', 'show_contact',
            'created_at', 'updated_at',
        ]

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None


class PublicUserProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    id = serializers.IntegerField(source='user.id', read_only=True)
    profile_picture_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = [
            'id', 'email', 'full_name', 'profession', 'education',
            'professional_details', 'years_of_experience', 'linkedin_profile_url',
            'bio', 'interests', 'profile_picture_url',
            'lat', 'lng', 'address', 'is_online',
            'location_visibility', 'show_contact',
        ]

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            return obj.profile_picture.url
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Hide location if visibility is 'none'
        if instance.location_visibility == 'none':
            data['lat'] = None
            data['lng'] = None
            data['address'] = ''
        # Hide contact info if not allowed
        if not instance.show_contact:
            data.pop('phone_number', None)
        return data
