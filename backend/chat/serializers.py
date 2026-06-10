from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Chat, Message
from users.models import UserProfile

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    profession = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'profile_picture_url', 'profession']

    def get_full_name(self, obj):
        try:
            return obj.profile.full_name
        except Exception:
            return obj.email

    def get_profile_picture_url(self, obj):
        try:
            pic = obj.profile.profile_picture
            if pic:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(pic.url)
                return pic.url
        except Exception:
            pass
        return None

    def get_profession(self, obj):
        try:
            return obj.profile.profession
        except Exception:
            return ''


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.IntegerField(source='sender.id', read_only=True)
    receiver_id = serializers.IntegerField(source='receiver.id', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'chat_id', 'sender_id', 'receiver_id', 'text', 'status', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    participants_data = ParticipantSerializer(source='participants', many=True, read_only=True)
    other_participant = serializers.SerializerMethodField()

    class Meta:
        model = Chat
        fields = [
            'id', 'participants_data', 'other_participant',
            'last_message_text', 'last_message_sender_id', 'last_message_at',
            'created_at', 'updated_at',
        ]

    def get_other_participant(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        other = obj.participants.exclude(id=request.user.id).first()
        if not other:
            return None
        return ParticipantSerializer(other, context=self.context).data
