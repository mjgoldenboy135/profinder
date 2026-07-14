from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Chat, Message, HiddenChat
from .serializers import ChatSerializer, MessageSerializer

User = get_user_model()


class ChatListView(APIView):
    def get(self, request):
        hidden_chat_ids = HiddenChat.objects.filter(user=request.user).values_list('chat_id', flat=True)
        chats = Chat.objects.filter(
            participants=request.user
        ).exclude(
            id__in=hidden_chat_ids
        ).prefetch_related('participants', 'participants__profile')
        serializer = ChatSerializer(chats, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        other_user_id = request.data.get('other_user_id')
        if not other_user_id:
            return Response({'detail': 'other_user_id is required.'}, status=400)
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        # Find existing chat between the two users
        existing = Chat.objects.filter(participants=request.user).filter(participants=other_user)
        if existing.exists():
            chat = existing.first()
            # Un-hide if hidden
            HiddenChat.objects.filter(user=request.user, chat=chat).delete()
        else:
            chat = Chat.objects.create()
            chat.participants.add(request.user, other_user)

        serializer = ChatSerializer(chat, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ChatDetailView(APIView):
    def get(self, request, pk):
        chat = generics.get_object_or_404(Chat, id=pk, participants=request.user)
        serializer = ChatSerializer(chat, context={'request': request})
        return Response(serializer.data)

    def delete(self, request, pk):
        chat = generics.get_object_or_404(Chat, id=pk, participants=request.user)
        HiddenChat.objects.get_or_create(user=request.user, chat=chat)
        return Response({'message': 'Chat hidden.'})


class MarkChatReadView(APIView):
    def post(self, request, pk):
        chat = generics.get_object_or_404(Chat, id=pk, participants=request.user)
        updated = chat.messages.filter(receiver=request.user).exclude(status='read').update(status='read')
        return Response({'marked_read': updated})


class MessageListView(APIView):
    def get(self, request, pk):
        chat = generics.get_object_or_404(Chat, id=pk, participants=request.user)
        # Opening a chat means the reader has seen everything sent to them.
        chat.messages.filter(receiver=request.user).exclude(status='read').update(status='read')
        messages = chat.messages.select_related('sender', 'receiver').all()
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request, pk):
        chat = generics.get_object_or_404(Chat, id=pk, participants=request.user)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({'detail': 'Message text is required.'}, status=400)
        receiver = chat.participants.exclude(id=request.user.id).first()
        if not receiver:
            return Response({'detail': 'No receiver found.'}, status=400)

        message = Message.objects.create(
            chat=chat,
            sender=request.user,
            receiver=receiver,
            text=text,
        )
        chat.last_message_text = text
        chat.last_message_sender_id = request.user.id
        chat.last_message_at = timezone.now()
        chat.save(update_fields=['last_message_text', 'last_message_sender_id', 'last_message_at', 'updated_at'])

        serializer = MessageSerializer(message, context={'request': request})

        # Broadcast via WebSocket
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'chat_{pk}',
                {
                    'type': 'chat_message',
                    'message': serializer.data,
                }
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)
