"use client"
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';
import Echo from 'laravel-echo';

// Configure Axios instance
const api = axios.create({
  baseURL: '/',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const message = error.response.data?.message || 'An error occurred';
      toast.error(message);
    } else {
      toast.error('Network error - please check your connection');
    }
    return Promise.reject(error);
  }
);

// Type declarations
declare global {
  interface Window {
    Echo: any;
  }
}

interface Organization {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  avatar_url: string;
  is_online: boolean;
  role: string;
  organization?: Organization | null;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: number;
  message: string;
  attachments: Attachment[];
  created_at: string;
  is_edited: boolean;
  user: User;
  reply_to_message?: {
    id: number;
    message: string;
    user: { name: string };
  };
  chat_room_id: number;
}

export interface ChatRoom {
  id: number;
  name: string;
  type: 'public' | 'private' | 'direct';
  image_url?: string;
  description?: string;
  last_message?: {
    message: string;
    created_at: string;
    user_name: string;
  };
  unread_count: number;
  members: User[];
  is_member: boolean;
  created_by: number;
  created_at: string;
}

interface ChatContextType {
  chatRooms: ChatRoom[];
  setChatRooms: React.Dispatch<React.SetStateAction<ChatRoom[]>>;
  activeRoom: ChatRoom | null;
  setActiveRoom: (room: ChatRoom | null) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  hasMoreMessages: boolean;
  loadMoreMessages: () => void;
  sendMessage: (message: string, attachments: File[], replyToMessageId?: number) => Promise<void>;
  deleteMessage: (messageId: number) => Promise<void>;
  createRoom: (name: string, type: 'public' | 'private', description?: string, image?: File, members?: number[]) => Promise<void>;
  createDirectChat: (userId: number) => Promise<void>;
  joinRoom: (roomId: number) => Promise<void>;
  leaveRoom: (roomId: number) => Promise<void>;
  setTypingStatus: (isTyping: boolean) => void;
  typingUsers: User[];
  markRoomAsRead: (roomId: number) => Promise<void>;
  allUsers: User[];
  currentUser: User;
  activeUsers: User[];
  replyingToMessage: ChatMessage | null;
  setReplyingToMessage: React.Dispatch<React.SetStateAction<ChatMessage | null>>;
  addMembers: (roomId: number, memberIds: number[]) => Promise<void>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { props } = usePage();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>((props.chatRooms as ChatRoom[]) || []);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [typingUsers, setTypingUsers] = useState<User[]>([]);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const allUsers = (props.allUsers as User[]) || [];
  const currentUser = (props.currentUser as User);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
    const isScrolledToBottomRef = useRef(true);

  // Initialize active users
  useEffect(() => {
    setActiveUsers(allUsers.filter(u => u.is_online));
  }, [allUsers]);

  const fetchMessages = useCallback(async (roomId: number, page: number = 1, append: boolean = false) => {
    try {
      const { data } = await api.get<{
        messages: ChatMessage[];
        has_more: boolean;
        current_page: number;
      }>(`/chat/rooms/${roomId}/messages`, { params: { page } });

      setMessages(prev => {
        const newMessages = data.messages.filter(msg => !prev.some(pMsg => pMsg.id === msg.id));
        return append ? [...newMessages.reverse(), ...prev] : newMessages.reverse();
      });
      setHasMoreMessages(data.has_more);
      setCurrentPage(data.current_page);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  }, []);

  // Real-time event handling
  useEffect(() => {
    if (!window.Echo || !activeRoom) {
      console.warn("Echo not initialized or no active room");
      return;
    }

    let channelName: string;
    let channel: any;

    switch (activeRoom.type) {
      case 'public':
        channelName = `public-chat.${activeRoom.id}`;
        channel = window.Echo.channel(channelName);
        break;
      case 'private':
        channelName = `private-chat.${activeRoom.id}`;
        channel = window.Echo.private(channelName);
        break;
      case 'direct':
        channelName = `direct-chat.${activeRoom.id}`;
        channel = window.Echo.private(channelName);
        break;
      default:
        return;
    }

    // Clear existing state when changing rooms
    setMessages([]);
    setCurrentPage(1);
    setTypingUsers([]);
    setReplyingToMessage(null);

    // Load initial messages
    fetchMessages(activeRoom.id).then(() => markRoomAsRead(activeRoom.id));

    // Message listener
    channel.listen('.message.sent', (e: { message: ChatMessage }) => {
      setMessages(prev => [...prev, e.message]);
      if (e.message.user.id !== currentUser.id) {
        markRoomAsRead(activeRoom.id);
      }
    });

    // Typing indicator listener
    channel.listen('.user.typing', (e: { user: User; is_typing: boolean }) => {
      setTypingUsers(prev =>
        e.is_typing
          ? [...prev.filter(u => u.id !== e.user.id), e.user]
          : prev.filter(u => u.id !== e.user.id)
      );
    });

    // Presence channel for private/direct chats
    if (activeRoom.type !== 'public') {
      const presenceChannel = window.Echo.join(`presence-chat.${activeRoom.id}`);

      presenceChannel
        .here((users: User[]) => setActiveUsers(users))
        .joining((user: User) => setActiveUsers(prev => [...prev, user]))
        .leaving((user: User) => setActiveUsers(prev => prev.filter(u => u.id !== user.id)));
    }

    return () => {
      if (window.Echo) {
        window.Echo.leave(channelName);
        if (activeRoom.type !== 'public') {
          window.Echo.leave(`presence-chat.${activeRoom.id}`);
        }
      }
    };
  }, [activeRoom?.id, currentUser.id, fetchMessages]);


  // Global room updates listener
  useEffect(() => {
    if (!window.Echo) return;

    const publicChannel = window.Echo.channel('chat-rooms');
    const privateChannel = window.Echo.private(`user.${currentUser.id}`);

    publicChannel.listen('RoomCreated', (e: { room: ChatRoom }) => {
      setChatRooms(prev => {
        if (e.room.type === 'public' || e.room.members.some(m => m.id === currentUser.id)) {
          return !prev.some(r => r.id === e.room.id)
            ? [e.room, ...prev].sort((a, b) =>
                new Date(b.last_message?.created_at || b.created_at).getTime() -
                new Date(a.last_message?.created_at || a.created_at).getTime()
              )
            : prev;
        }
        return prev;
      });
    });

    privateChannel.listen('RoomCreated', (e: { room: ChatRoom }) => {
      setChatRooms(prev => !prev.some(r => r.id === e.room.id) ? [e.room, ...prev] : prev);
    });

    return () => {
      if (window.Echo) {
        window.Echo.leave('chat-rooms');
        window.Echo.leave(`user.${currentUser.id}`);
      }
    };
  }, [currentUser.id]);

  const loadMoreMessages = useCallback(() => {
    if (activeRoom && hasMoreMessages) {
      fetchMessages(activeRoom.id, currentPage + 1, true);
    }
  }, [activeRoom, hasMoreMessages, currentPage, fetchMessages]);

  const sendMessage = useCallback(async (message: string, attachments: File[] = [], replyToMessageId?: number) => {
    if (!activeRoom) return;

    // Create optimistic message
    const tempId = Date.now();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      message,
      attachments: attachments.map(file => ({
        name: file.name,
        url: URL.createObjectURL(file),
        type: file.type,
        size: file.size
      })),
      created_at: new Date().toISOString(),
      is_edited: false,
      user: currentUser,
      reply_to_message: replyToMessageId ? {
        id: replyToMessageId,
        message: messages.find(m => m.id === replyToMessageId)?.message || '',
        user: { name: currentUser.name }
      } : undefined,
      chat_room_id: activeRoom.id
    };

    // Add to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);
    setReplyingToMessage(null);

    const formData = new FormData();
    formData.append('message', message);
    attachments.forEach(file => formData.append('attachments[]', file));
    if (replyToMessageId) formData.append('reply_to_message_id', replyToMessageId.toString());

    try {
      const { data } = await api.post<{ message: ChatMessage }>(
        `/chat/rooms/${activeRoom.id}/messages`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? data.message : msg
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message if failed
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error('Failed to send message');
    }
  }, [activeRoom, currentUser, messages]);

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  }, []);

  const createRoom = useCallback(async (
    name: string,
    type: 'public' | 'private',
    description?: string,
    image?: File,
    members?: number[]
  ) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('type', type);
    if (description) formData.append('description', description);
    if (image) formData.append('image', image);
    if (type === 'private' && members) {
      members.forEach(id => formData.append('members[]', id.toString()));
    }

    try {
      const { data } = await api.post<{ room: ChatRoom }>('/chat/rooms', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setActiveRoom(data.room);
      toast.success('Room created successfully');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
    }
  }, []);

  const createDirectChat = useCallback(async (userId: number) => {
    try {
      const { data } = await api.post<{ room: ChatRoom }>('/chat/direct-chat', { user_id: userId });
      setActiveRoom(data.room);
      toast.success('Direct chat started');
    } catch (error) {
      console.error('Error creating direct chat:', error);
      toast.error('Failed to start direct chat');
    }
  }, []);

  const addMembers = useCallback(async (roomId: number, memberIds: number[]) => {
    try {
      const { data } = await api.post(`/chat/rooms/${roomId}/members`, { members: memberIds });

      setChatRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          const newMembers = allUsers.filter(user =>
            memberIds.includes(user.id) && !room.members.some(m => m.id === user.id)
          );
          return { ...room, members: [...room.members, ...newMembers] };
        }
        return room;
      }));

      if (activeRoom?.id === roomId) {
        setActiveRoom(prev => {
          if (!prev) return null;
          const newMembers = allUsers.filter(user =>
            memberIds.includes(user.id) && !prev.members.some(m => m.id === user.id)
          );
          return { ...prev, members: [...prev.members, ...newMembers] };
        });
      }

      return data;
    } catch (error) {
      console.error('Error adding members:', error);
      toast.error('Failed to add members');
      throw error;
    }
  }, [allUsers, activeRoom?.id]);

  const joinRoom = useCallback(async (roomId: number) => {
    try {
      await api.post(`/chat/rooms/${roomId}/join`);
      setChatRooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, is_member: true } : room
      ));
      toast.success('Joined room successfully');
    } catch (error) {
      console.error('Error joining room:', error);
      toast.error('Failed to join room');
    }
  }, []);

  const leaveRoom = useCallback(async (roomId: number) => {
    try {
      await api.post(`/chat/rooms/${roomId}/leave`);
      setChatRooms(prev => prev.filter(room => room.id !== roomId));
      if (activeRoom?.id === roomId) {
        setActiveRoom(null);
        setMessages([]);
      }
      toast.success('Left room successfully');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast.error('Failed to leave room');
    }
  }, [activeRoom]);

  const setTypingStatus = useDebounce(async (isTyping: boolean) => {
    if (!activeRoom) return;
    try {
      await api.post(`/chat/rooms/${activeRoom.id}/typing`, { is_typing: isTyping });
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, 300);

  const markRoomAsRead = useCallback(async (roomId: number) => {
    try {
      await api.post(`/chat/rooms/${roomId}/mark-as-read`);
      setChatRooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, unread_count: 0 } : room
      ));
    } catch (error) {
      console.error('Error marking room as read:', error);
    }
  }, []);

  // Auto-scroll handling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      isScrolledToBottomRef.current =
        container.scrollHeight - container.scrollTop <= container.clientHeight + 10;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current && isScrolledToBottomRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatContext.Provider
      value={{
        chatRooms,
        setChatRooms,
        activeRoom,
        setActiveRoom,
        messages,
        setMessages,
        hasMoreMessages,
        loadMoreMessages,
        sendMessage,
        deleteMessage,
        createRoom,
        createDirectChat,
        joinRoom,
        leaveRoom,
        setTypingStatus,
        typingUsers,
        markRoomAsRead,
        allUsers,
        currentUser,
        activeUsers,
        replyingToMessage,
        setReplyingToMessage,
        addMembers,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
