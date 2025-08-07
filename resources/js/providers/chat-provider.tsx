"use client"
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

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
  avatar: string;
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
  image?: string;
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
    }
  }, []);

  // Real-time event handling
  useEffect(() => {
    if (!window.Echo) {
      console.warn("Laravel Echo not initialized");
      return;
    }

    let currentChannelName: string | null = null;

    if (activeRoom) {
      setMessages([]);
      setCurrentPage(1);
      setTypingUsers([]);
      setReplyingToMessage(null);

      fetchMessages(activeRoom.id).then(() => markRoomAsRead(activeRoom.id));

      currentChannelName = activeRoom.type === 'public'
        ? `chat.${activeRoom.id}`
        : `presence-chat-room.${activeRoom.id}`;

      if (activeRoom.type === 'public') {
        window.Echo.channel(currentChannelName)
          .listen('MessageSent', (e: { message: ChatMessage }) => {
            setMessages(prev => [...prev, e.message]);
            if (e.message.user.id !== currentUser.id) {
              markRoomAsRead(activeRoom.id);
            }
          })
          .listen('UserTyping', (e: { user: User; is_typing: boolean }) => {
            setTypingUsers(prev =>
              e.is_typing
                ? [...prev.filter(u => u.id !== e.user.id), e.user]
                : prev.filter(u => u.id !== e.user.id)
            );
          });
      } else {
        window.Echo.join(currentChannelName)
          .here((users: User[]) => setActiveUsers(users))
          .joining((user: User) => setActiveUsers(prev => [...prev, user]))
          .leaving((user: User) => setActiveUsers(prev => prev.filter(u => u.id !== user.id)))
          .listen('MessageSent', (e: { message: ChatMessage }) => {
            setMessages(prev => [...prev, e.message]);
            if (e.message.user.id !== currentUser.id) {
              markRoomAsRead(activeRoom.id);
            }
          })
          .listen('UserTyping', (e: { user: User; is_typing: boolean }) => {
            setTypingUsers(prev =>
              e.is_typing
                ? [...prev.filter(u => u.id !== e.user.id), e.user]
                : prev.filter(u => u.id !== e.user.id)
            );
          });
      }
    }

    return () => {
      if (window.Echo && currentChannelName) {
        window.Echo.leave(currentChannelName);
      }
    };
  }, [activeRoom, fetchMessages, currentUser.id]);

  // Global room updates
  useEffect(() => {
    if (!window.Echo) return;

    window.Echo.channel('chat-rooms')
      .listen('RoomCreated', (e: { room: ChatRoom }) => {
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

    window.Echo.private(`user.${currentUser.id}`)
      .listen('RoomCreated', (e: { room: ChatRoom }) => {
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

  const sendMessage = useCallback(async (message: string, attachments: File[], replyToMessageId?: number) => {
    if (!activeRoom) return;

    const formData = new FormData();
    formData.append('message', message);
    attachments.forEach(file => formData.append('attachments[]', file));
    if (replyToMessageId) formData.append('reply_to_message_id', replyToMessageId.toString());

    try {
      await api.post(`/chat/rooms/${activeRoom.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setReplyingToMessage(null);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [activeRoom]);

  const deleteMessage = useCallback(async (messageId: number) => {
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  }, []);

  const createRoom = useCallback(async (name: string, type: 'public' | 'private', description?: string, image?: File, members?: number[]) => {
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
      toast.success('Room created');
    } catch (error) {
      console.error('Error creating room:', error);
    }
  }, []);

  const createDirectChat = useCallback(async (userId: number) => {
    try {
      const { data } = await api.post<{ room: ChatRoom }>('/chat/direct-chat', { user_id: userId });
      setActiveRoom(data.room);
      toast.success('Direct chat started');
    } catch (error) {
      console.error('Error creating direct chat:', error);
    }
  }, []);

  const joinRoom = useCallback(async (roomId: number) => {
    try {
      await api.post(`/chat/rooms/${roomId}/join`);
      setChatRooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, is_member: true } : room
      ));
      toast.success('Joined room');
    } catch (error) {
      console.error('Error joining room:', error);
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
      toast.success('Left room');
    } catch (error) {
      console.error('Error leaving room:', error);
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
