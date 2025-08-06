<?php
// app/Http/Controllers/ChatController.php
namespace App\Http\Controllers;

use App\Events\MessageSent;
use App\Events\UserTyping;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class ChatController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Get user's chat rooms with latest message and unread count
        $chatRooms = $user->chatRooms()
            ->with(['latestMessage.user', 'members'])
            ->where('is_active', true)
            ->get()
            ->map(function ($room) {
                $latestMessage = $room->latestMessage->first();
                return [
                    'id' => $room->id,
                    'name' => $room->name,
                    'type' => $room->type,
                    'image' => $room->image ? asset('storage/' . $room->image) : null,
                    'last_message' => $latestMessage ? [
                        'message' => $latestMessage->message ?: '[Attachment]',
                        'created_at' => $latestMessage->created_at->diffForHumans(),
                        'user_name' => $latestMessage->user->name,
                    ] : null,
                    'unread_count' => $room->unread_count,
                    'members' => $room->members->map(fn($member) => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'avatar' => $member->avatar_url ?? '/placeholder.svg?height=32&width=32',
                        'is_online' => $member->is_online ?? false,
                        'role' => $member->role,
                        'organization_id' => $member->organization_id,
                    ]),
                ];
            });

        // Get all users for creating new chats (excluding current user)
        $allUsers = User::where('id', '!=', $user->id)
            ->select('id', 'name', 'image', 'login_status', 'role')
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'avatar' => $u->avatar_url ?? '/placeholder.svg?height=32&width=32',
                'is_online' => $u->is_online ?? false,
                'role' => $u->role,
            ]);

        return Inertia::render('chat/index', [
            'chatRooms' => $chatRooms,
            'allUsers' => $allUsers,
            'currentUser' => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar' => $user->avatar_url ?? '/placeholder.svg?height=32&width=32',
                'role' => $user->role,
                'organization_id' => $user->organization_id,
            ],
        ]);
    }

    public function getMessages(Request $request, ChatRoom $chatRoom)
    {
        // Check if user is member of this chat room
        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            abort(403, 'You are not a member of this chat room');
        }

        $page = $request->get('page', 1);
        $perPage = 20;

        $messages = $chatRoom->messages()
            ->with(['user', 'replyToMessage.user'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        return response()->json([
            'messages' => $messages->items()->map(function ($message) {
                return [
                    'id' => $message->id,
                    'message' => $message->message,
                    'attachments' => $message->attachments,
                    'created_at' => $message->created_at->toISOString(),
                    'is_edited' => $message->is_edited,
                    'user' => [
                        'id' => $message->user->id,
                        'name' => $message->user->name,
                        'avatar' => $message->user->avatar_url ?? '/placeholder.svg?height=32&width=32',
                    ],
                    'reply_to_message' => $message->replyToMessage ? [
                        'id' => $message->replyToMessage->id,
                        'message' => $message->replyToMessage->message,
                        'user' => [
                            'name' => $message->replyToMessage->user->name,
                        ],
                    ] : null,
                ];
            }),
            'has_more' => $messages->hasMorePages(),
            'current_page' => $messages->currentPage(),
        ]);
    }

    public function sendMessage(Request $request, ChatRoom $chatRoom)
    {
        $request->validate([
            'message' => 'nullable|string|max:5000',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240', // 10MB max per file
            'reply_to_message_id' => 'nullable|exists:chat_messages,id',
        ]);

        // Check if user is member of this chat room
        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            abort(403, 'You are not a member of this chat room');
        }

        $attachments = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('chat-attachments', 'public');
                $attachments[] = [
                    'name' => $file->getClientOriginalName(),
                    'url' => asset('storage/' . $path),
                    'type' => $file->getMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }

        $message = ChatMessage::create([
            'chat_room_id' => $chatRoom->id,
            'user_id' => auth()->id(),
            'message' => $request->message,
            'attachments' => $attachments ?: null,
            'reply_to_message_id' => $request->reply_to_message_id,
        ]);

        $message->load(['user', 'replyToMessage.user']);

        // Broadcast the message
        broadcast(new MessageSent($message));

        return response()->json([
            'message' => [
                'id' => $message->id,
                'message' => $message->message,
                'attachments' => $message->attachments,
                'created_at' => $message->created_at->toISOString(),
                'is_edited' => $message->is_edited,
                'user' => [
                    'id' => $message->user->id,
                    'name' => $message->user->name,
                    'avatar' => $message->user->avatar_url ?? '/placeholder.svg?height=32&width=32',
                ],
                'reply_to_message' => $message->replyToMessage ? [
                    'id' => $message->replyToMessage->id,
                    'message' => $message->replyToMessage->message,
                    'user' => [
                        'name' => $message->replyToMessage->user->name,
                    ],
                ] : null,
            ],
        ]);
    }

    public function deleteMessage(ChatMessage $message)
    {
        // Check if user owns this message or is admin of the chat room
        if ($message->user_id !== auth()->id()) {
            $isAdmin = $message->chatRoom->members()
                ->where('user_id', auth()->id())
                ->where('role', 'admin')
                ->exists();

            if (!$isAdmin) {
                abort(403, 'You can only delete your own messages');
            }
        }

        // Delete attachments from storage
        if ($message->attachments) {
            foreach ($message->attachments as $attachment) {
                $path = str_replace(asset('storage/'), '', $attachment['url']);
                Storage::disk('public')->delete($path);
            }
        }

        $message->delete();

        return response()->json(['success' => true]);
    }

    public function createRoom(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type' => 'required|in:public,private',
            'members' => 'nullable|array',
            'members.*' => 'exists:users,id',
            'image' => 'nullable|image|max:2048',
        ]);

        // Only organizations can create rooms
        if (auth()->user()->role !== 'organization') {
            abort(403, 'Only organizations can create chat rooms');
        }

        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat-rooms', 'public');
        }

        $chatRoom = ChatRoom::create([
            'name' => $request->name,
            'description' => $request->description,
            'type' => $request->type,
            'created_by' => auth()->id(),
            'image' => $imagePath,
        ]);

        // Add creator as admin
        $chatRoom->members()->attach(auth()->id(), [
            'role' => 'admin',
            'joined_at' => now(),
        ]);

        // Add selected members for private rooms
        if ($request->type === 'private' && $request->members) {
            $memberIds = collect($request->members)->filter(fn($id) => $id !== auth()->id());
            $chatRoom->members()->attach($memberIds, [
                'role' => 'member',
                'joined_at' => now(),
            ]);
        }

        return response()->json([
            'room' => [
                'id' => $chatRoom->id,
                'name' => $chatRoom->name,
                'type' => $chatRoom->type,
                'image' => $chatRoom->image ? asset('storage/' . $chatRoom->image) : null,
                'unread_count' => 0,
                'members' => $chatRoom->members->map(fn($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'avatar' => $member->avatar_url ?? '/placeholder.svg?height=32&width=32',
                    'is_online' => $member->is_online ?? false,
                ]),
            ],
        ]);
    }

    public function createDirectChat(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $otherUserId = $request->user_id;
        $currentUserId = auth()->id();

        // Check if direct chat already exists
        $existingRoom = ChatRoom::where('type', 'direct')
            ->whereHas('members', function ($query) use ($currentUserId) {
                $query->where('user_id', $currentUserId);
            })
            ->whereHas('members', function ($query) use ($otherUserId) {
                $query->where('user_id', $otherUserId);
            })
            ->first();

        if ($existingRoom) {
            return response()->json([
                'room' => [
                    'id' => $existingRoom->id,
                    'name' => $existingRoom->name,
                    'type' => $existingRoom->type,
                    'image' => null,
                    'unread_count' => $existingRoom->unread_count,
                    'members' => $existingRoom->members->map(fn($member) => [
                        'id' => $member->id,
                        'name' => $member->name,
                        'avatar' => $member->avatar_url ?? '/placeholder.svg?height=32&width=32',
                        'is_online' => $member->is_online ?? false,
                    ]),
                ],
            ]);
        }

        // Create new direct chat
        $otherUser = User::find($otherUserId);
        $chatRoom = ChatRoom::create([
            'name' => $otherUser->name,
            'type' => 'direct',
            'created_by' => $currentUserId,
        ]);

        // Add both users as members
        $chatRoom->members()->attach([
            $currentUserId => ['role' => 'member', 'joined_at' => now()],
            $otherUserId => ['role' => 'member', 'joined_at' => now()],
        ]);

        return response()->json([
            'room' => [
                'id' => $chatRoom->id,
                'name' => $chatRoom->name,
                'type' => $chatRoom->type,
                'image' => null,
                'unread_count' => 0,
                'members' => $chatRoom->members->map(fn($member) => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'avatar' => $member->avatar_url ?? '/placeholder.svg?height=32&width=32',
                    'is_online' => $member->is_online ?? false,
                ]),
            ],
        ]);
    }

    public function joinRoom(ChatRoom $chatRoom)
    {
        // Only allow joining public rooms or if user is invited to private rooms
        if ($chatRoom->type === 'private') {
            abort(403, 'Cannot join private rooms without invitation');
        }

        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            $chatRoom->members()->attach(auth()->id(), [
                'role' => 'member',
                'joined_at' => now(),
            ]);
        }

        return response()->json(['success' => true]);
    }

    public function leaveRoom(ChatRoom $chatRoom)
    {
        $chatRoom->members()->detach(auth()->id());
        return response()->json(['success' => true]);
    }

    public function typing(Request $request, ChatRoom $chatRoom)
    {
        $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        // Check if user is member of this chat room
        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            abort(403, 'You are not a member of this chat room');
        }

        broadcast(new UserTyping(auth()->user(), $chatRoom->id, $request->is_typing));

        return response()->json(['success' => true]);
    }

    public function markAsRead(ChatRoom $chatRoom)
    {
        // Update last seen timestamp
        $chatRoom->members()
            ->where('user_id', auth()->id())
            ->update(['last_seen_at' => now()]);

        return response()->json(['success' => true]);
    }
}
