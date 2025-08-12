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
    room_update: RoomUpdate;
}

export interface LastMessage {
  message: string;
  created_at: string;
  user_name: string;
}

export interface RoomUpdate {
  room_id: number;
  last_message: LastMessage;
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


    useEffect(() => {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
console.log('CSRF Token:', csrfToken); // Debug token

window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'fallback_key',
    wsHost: import.meta.env.VITE_REVERB_HOST || window.location.hostname,
    wsPort: import.meta.env.VITE_REVERB_PORT || 8080,
    forceTLS: false, // Disable for local testing
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': csrfToken,
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`, // If using API auth
        },
    },
});
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

  // Initialize active users
  useEffect(() => {
    setActiveUsers(allUsers.filter(u => u.is_online));
  }, [allUsers]);

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

    useEffect(() => {
  if (!window.Echo || !currentUser?.id) return;

  const privateChannel = window.Echo.private(`user.${currentUser.id}`);

  privateChannel.listen('.MessageSent', (e: any) => {
    // Handle room updates
    if (e.room_update) {
      setChatRooms(prev => {
        const updatedRooms = prev.map(room =>
          room.id === e.room_update.room_id ? {
            ...room,
            last_message: e.room_update.last_message,
            unread_count: activeRoom?.id === e.room_update.room_id ? 0 : room.unread_count + 1
          } : room
        );

        // Sort rooms by last message time
        return [...updatedRooms].sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at;
          const timeB = b.last_message?.created_at || b.created_at;
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
      });
    }

    // Handle message if in active room
    if (activeRoom?.id === e.message?.chat_room_id) {
      setMessages(prev => [...prev, e.message]);
    }
  });

  return () => {
    privateChannel.stopListening('.MessageSent');
    window.Echo.leave(`user.${currentUser.id}`);
  };
    }, [currentUser?.id, activeRoom?.id]);

  // Real-time event handling
useEffect(() => {
    // Wait for Echo to be available
    const initializeEcho = () => {
        if (!window.Echo) {
            console.warn("Echo not initialized yet, retrying...");
            setTimeout(initializeEcho, 100);
            return;
        }

        if (!activeRoom) {
            console.warn("No active room selected");
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
        channel.listen('.MessageSent', (e: { message: ChatMessage }) => {
            setMessages(prev => {
                console.log("Received message:", e.message);
                // Check if message already exists (from optimistic update)
                const exists = prev.some(m => m.id === e.message.id);
                return exists ? prev : [...prev, e.message];
            });

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

        // Add membership event listeners
        channel.listen('.member.joined', (e: { user: User }) => {
            setChatRooms(prev => prev.map(room =>
            room.id === activeRoom.id
                ? {
                    ...room,
                    members: [...room.members, e.user],
                    is_member: room.id === activeRoom.id ? true : room.is_member
                }
                : room
            ));

            if (activeRoom.id === activeRoom?.id) {
            setActiveRoom(prev => prev ? {
                ...prev,
                members: [...prev.members, e.user],
                is_member: true
            } : null);
            }
        });

        channel.listen('.member.left', (e: { user_id: number }) => {
            setChatRooms(prev => prev.map(room =>
            room.id === activeRoom.id
                ? {
                    ...room,
                    members: room.members.filter(m => m.id !== e.user_id),
                    is_member: room.id === activeRoom.id
                    ? room.members.some(m => m.id === currentUser.id && m.id !== e.user_id)
                    : room.is_member
                }
                : room
            ));

            if (activeRoom.id === activeRoom?.id) {
            setActiveRoom(prev => prev ? {
                ...prev,
                members: prev.members.filter(m => m.id !== e.user_id),
                is_member: prev.members.some(m => m.id === currentUser.id && m.id !== e.user_id)
            } : null);
            }
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
    };

    initializeEcho();
}, [activeRoom?.id, currentUser.id, fetchMessages, markRoomAsRead]);

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

        // if (type === 'public' ||
        //     (type === 'private' && members?.includes(currentUser.id))) {
        // setChatRooms(prev => [data.room, ...prev]);
        // }
      toast.success('Room created successfully');
    } catch (error) {
      console.error('Error creating room:', error);
      toast.error('Failed to create room');
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
  }, [activeRoom?.id]);

  // Global room updates listener
useEffect(() => {
  if (!window.Echo) {
    console.error("Echo not initialized");
    return;
  }

  console.log("Setting up room listeners for user:", currentUser.id);

  // Public room listener
  const publicChannel = window.Echo.channel('chat-rooms');
  publicChannel.listen('.RoomCreated', (e: any) => {
    console.log("Public room created:", e.room);
    setChatRooms(prev => {
      const exists = prev.some(r => r.id === e.room.id);
      return exists ? prev : [e.room, ...prev];
    });
  });

  // Private room listener
  const privateChannel = window.Echo.private(`user.${currentUser.id}`);
  privateChannel.listen('.RoomCreated', (e: any) => {
    console.log("Private room received:", e.room);
    setChatRooms(prev => {
      const exists = prev.some(r => r.id === e.room.id);
      if (!exists) {
        console.log("Adding private room to list");
        return [e.room, ...prev];
      }
      return prev;
    });
  });

  return () => {
    publicChannel.stopListening('.RoomCreated');
    privateChannel.stopListening('.RoomCreated');
    window.Echo.leave('chat-rooms.public');
    window.Echo.leave(`user.${currentUser.id}`);
  };
}, [currentUser.id, addMembers, leaveRoom]);

  const loadMoreMessages = useCallback(() => {
    if (activeRoom && hasMoreMessages) {
      fetchMessages(activeRoom.id, currentPage + 1, true);
    }
  }, [activeRoom, hasMoreMessages, currentPage, fetchMessages]);

    const deduplicateMessages = useCallback((messages: ChatMessage[]) => {
    const seen = new Set();
    return messages.filter(msg => {
      const duplicate = seen.has(msg.id);
      seen.add(msg.id);
      return !duplicate;
    });
  }, []);

  const sendMessage = useCallback(async (message: string, attachments: File[] = [], replyToMessageId?: number) => {
    if (!activeRoom) return;

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

    // setMessages(prev => deduplicateMessages([...prev, optimisticMessage]));
    setReplyingToMessage(null);

    const formData = new FormData();
    formData.append('message', message);
    attachments.forEach(file => formData.append('attachments[]', file));
    if (replyToMessageId) formData.append('reply_to_message_id', replyToMessageId.toString());

    try {
      await api.post(`/chat/rooms/${activeRoom.id}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      toast.error('Failed to send message');
    }
  }, [activeRoom, currentUser, messages, deduplicateMessages]);

  // Update your real-time event listener
  useEffect(() => {
    if (!window.Echo || !activeRoom) return;


    const channelName = activeRoom.type === 'public'
      ? `public-chat.${activeRoom.id}`
      : `private-chat.${activeRoom.id}`;

    const channel = activeRoom.type === 'public'
      ? window.Echo.channel(channelName)
      : window.Echo.private(channelName);

    channel.listen('.MessageSent', (e: { message: ChatMessage }) => {
      setMessages(prev => {
        const existingMessage = prev.find(msg => msg.id === e.message.id);
        if (existingMessage) return prev;

        const optimisticMatch = prev.find(msg =>
          msg.id > 1000000 && // Temporary ID
          msg.user.id === e.message.user.id &&
          msg.message === e.message.message
        );

        if (optimisticMatch) {
          return deduplicateMessages([
            ...prev.filter(msg => msg.id !== optimisticMatch.id),
            e.message
          ]);
        }

        return deduplicateMessages([...prev, e.message]);
      });

      if (e.message.user.id !== currentUser.id) {
        markRoomAsRead(activeRoom.id);
      }
    });

    return () => {
      window.Echo.leave(channelName);
    };
  }, [activeRoom, currentUser.id, deduplicateMessages, markRoomAsRead]);

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


  const joinRoom = useCallback(async (roomId: number) => {
  try {
    await api.post(`/chat/rooms/${roomId}/join`);

    // Optimistically update the UI
    setChatRooms(prev => prev.map(room =>
      room.id === roomId ? { ...room, is_member: true } : room
    ));

    if (activeRoom?.id === roomId) {
      setActiveRoom(prev => prev ? {
        ...prev,
        is_member: true,
        members: [...prev.members, currentUser]
      } : null);
    }

    toast.success('Joined room successfully');
  } catch (error) {
    console.error('Error joining room:', error);
    toast.error('Failed to join room');
  }
}, [activeRoom?.id, currentUser]);


  const setTypingStatus = useDebounce(async (isTyping: boolean) => {
    if (!activeRoom) return;
    try {
      await api.post(`/chat/rooms/${activeRoom.id}/typing`, { is_typing: isTyping });
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, 300);

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
