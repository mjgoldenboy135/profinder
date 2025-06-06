
import type { User, Chat, Message } from './types';

export const placeholderUsers: User[] = [
  {
    id: '1',
    fullName: 'Alice Wonderland',
    email: 'alice@example.com',
    profilePictureUrl: 'https://placehold.co/100x100.png?text=AW',
    education: 'MSc Computer Science, Wonderland University',
    profession: 'Software Engineer',
    professionalDetails: 'Experienced full-stack developer with a passion for creating intuitive user experiences. Skilled in React, Node.js, and cloud technologies.',
    yearsOfExperience: 5,
    linkedinProfileUrl: 'https://linkedin.com/in/alicewonderland',
    phoneNumber: '555-0101',
    location: { lat: 37.7749, lng: -122.4194, address: 'San Francisco, CA' },
    isOnline: true,
    bio: 'Tech enthusiast and avid reader. Always looking to learn new things.',
    interests: ['AI', 'Web Development', 'Hiking'],
  },
  {
    id: '2',
    fullName: 'Bob The Builder',
    email: 'bob@example.com',
    profilePictureUrl: 'https://placehold.co/100x100.png?text=BB',
    education: 'BEng Civil Engineering, Builderstown Institute',
    profession: 'Project Manager',
    professionalDetails: 'Dedicated project manager with a track record of delivering complex construction projects on time and within budget. Strong leadership and communication skills.',
    yearsOfExperience: 10,
    linkedinProfileUrl: 'https://linkedin.com/in/bobthebuilder',
    location: { lat: 34.0522, lng: -118.2437, address: 'Los Angeles, CA' },
    isOnline: false,
    bio: 'Love building things, both professionally and as a hobby. My dog is my best friend.',
    interests: ['Construction', 'DIY Projects', 'Dogs'],
  },
  {
    id: '3',
    fullName: 'Carol Danvers',
    email: 'carol@example.com',
    profilePictureUrl: 'https://placehold.co/100x100.png?text=CD',
    education: 'PhD Astrophysics, Starfleet Academy',
    profession: 'Consultant',
    professionalDetails: 'Strategic consultant helping businesses leverage technology for growth. Expertise in market analysis and digital transformation.',
    yearsOfExperience: 8,
    linkedinProfileUrl: 'https://linkedin.com/in/caroldanvers',
    location: { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
    isOnline: true,
    bio: 'Passionate about space, technology, and empowering others. Always up for a challenge.',
    interests: ['Space Exploration', 'Tech Startups', 'Volunteering'],
  },
  {
    id: '4',
    fullName: 'David Copperfield',
    email: 'david@example.com',
    profession: 'UX Designer',
    yearsOfExperience: 3,
    location: { lat: 51.5074, lng: -0.1278, address: 'London, UK' },
    isOnline: true,
    profilePictureUrl: 'https://placehold.co/100x100.png?text=DC',
    bio: 'Creating magical user experiences. Coffee aficionado.',
    interests: ['Design Thinking', 'Minimalism', 'Photography'],
  },
  {
    id: '5',
    fullName: 'Eve Harrington',
    email: 'eve@example.com',
    profession: 'Marketing Specialist',
    yearsOfExperience: 6,
    location: { lat: 48.8566, lng: 2.3522, address: 'Paris, FR' },
    isOnline: false,
    profilePictureUrl: 'https://placehold.co/100x100.png?text=EH',
    bio: 'Storyteller and brand builder. Passionate about digital marketing trends.',
    interests: ['Content Creation', 'Social Media Strategy', 'Travel'],
  }
];

// Made placeholderChats mutable for simulation purposes
export let placeholderChats: Chat[] = [
  {
    id: 'chat1',
    participantIds: ['1', '2'],
    participants: [
      { id: '1', fullName: 'Alice Wonderland', profilePictureUrl: 'https://placehold.co/40x40.png?text=AW' },
      { id: '2', fullName: 'Bob The Builder', profilePictureUrl: 'https://placehold.co/40x40.png?text=BB' },
    ],
    lastMessage: {
      id: 'msg1',
      chatId: 'chat1',
      senderId: '2',
      receiverId: '1',
      text: 'Sounds good, Alice!',
      timestamp: new Date().setDate(new Date().getDate() -1), // Yesterday
      status: 'read',
    },
    createdAt: new Date().setDate(new Date().getDate() - 2),
    updatedAt: new Date().setDate(new Date().getDate() -1),
  },
  {
    id: 'chat2',
    participantIds: ['1', '3'],
    participants: [
      { id: '1', fullName: 'Alice Wonderland', profilePictureUrl: 'https://placehold.co/40x40.png?text=AW' },
      { id: '3', fullName: 'Carol Danvers', profilePictureUrl: 'https://placehold.co/40x40.png?text=CD' },
    ],
    lastMessage: {
      id: 'msg2',
      chatId: 'chat2',
      senderId: '1',
      receiverId: '3',
      text: 'Let\'s discuss the project tomorrow.',
      timestamp: new Date().setHours(new Date().getHours() - 2), // 2 hours ago
      status: 'delivered',
    },
    createdAt: new Date().setDate(new Date().getDate() - 1),
    updatedAt: new Date().setHours(new Date().getHours() - 2),
  },
];

// Made placeholderMessages mutable for simulation purposes
export let placeholderMessages: Message[] = [
  {
    id: 'msgA1',
    chatId: 'chat1',
    senderId: '1', // Alice
    receiverId: '2', // Bob
    text: 'Hi Bob, how is the project going?',
    timestamp: new Date(new Date().setDate(new Date().getDate() -1)).setHours(10, 0, 0), // Yesterday 10:00
    status: 'read',
  },
  {
    id: 'msgA2',
    chatId: 'chat1',
    senderId: '2', // Bob
    receiverId: '1', // Alice
    text: 'Hey Alice! It\'s going well, almost done with phase one.',
    timestamp: new Date(new Date().setDate(new Date().getDate() -1)).setHours(10, 5, 0), // Yesterday 10:05
    status: 'read',
  },
  {
    id: 'msg1', // This is the lastMessage for chat1
    chatId: 'chat1',
    senderId: '2', // Bob
    receiverId: '1', // Alice
    text: 'Sounds good, Alice!',
    timestamp: new Date(new Date().setDate(new Date().getDate() -1)).setHours(10, 10, 0), // Yesterday 10:10
    status: 'read',
  },
  {
    id: 'msgB1',
    chatId: 'chat2',
    senderId: '3', // Carol
    receiverId: '1', // Alice
    text: 'Alice, can we sync up on the proposal?',
    timestamp: new Date().setHours(new Date().getHours() - 3), // 3 hours ago
    status: 'delivered',
  },
  {
    id: 'msg2', // This is the lastMessage for chat2
    chatId: 'chat2',
    senderId: '1', // Alice
    receiverId: '3', // Carol
    text: 'Let\'s discuss the project tomorrow.',
    timestamp: new Date().setHours(new Date().getHours() - 2), // 2 hours ago
    status: 'delivered',
  },
];

export const getCurrentUser = (): User => placeholderUsers[0]; // Alice is the current user for mocks
