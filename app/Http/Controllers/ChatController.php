<?php
// app/Http/Controllers/ChatController.php
namespace App\Http\Controllers;

use App\Events\MemberJoined;
use App\Events\MemberLeft;
use App\Events\MessageSent;
use App\Events\RoomCreated;
use App\Events\RoomUpdated;
use App\Events\UserTyping;
use App\Jobs\SendChatMessageNotification;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\ChatTopic;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ChatController extends Controller
{
    public function index()
    {
        $user = auth()->user();

        // Get user's interested topic IDs
        $interestedTopicIds = $user->interestedTopics()->pluck('chat_topics.id')->toArray();

        // Get chat rooms the user is a member of
        $userChatRooms = $user->chatRooms()
            ->with(['members.organization', 'latestMessage.user', 'topics'])
            ->where('is_active', true)
            ->get();

        // Get public chat rooms that user is NOT a member of but matches interested topics
        $publicRooms = ChatRoom::where('type', 'public')
            ->where('is_active', true)
            ->whereDoesntHave('members', function ($query) use ($user) {
                $query->where('user_id', $user->id);
            })
            ->whereHas('topics', function ($query) use ($interestedTopicIds, $user) {
                if($user->role === 'organization' || $user->role === 'user') {
                    $query->whereIn('chat_topics.id', $interestedTopicIds);
                }
            })
            ->with(['members.organization', 'latestMessage.user', 'topics'])
            ->get();

        // Combine and remove duplicates
        $allRooms = $userChatRooms->merge($publicRooms)->unique('id');

        $chatRooms = $allRooms->map(function ($room) use ($user) {
            $latestMessage = $room->latestMessage->first();
            $isMember = $room->members->contains('id', $user->id);

            return [
                'id' => $room->id,
                'name' => $room->name,
                'type' => $room->type,
                'image' => $room->image_url,
                'description' => $room->description,
                'created_at' => $room->created_at->toISOString(),
                'last_message' => $latestMessage ? [
                    'message' => $latestMessage->message ?? '',
                    'created_at' => $latestMessage->created_at->toISOString() ?? "",
                    'user_name' => $latestMessage->user->name ?? "",
                ] : null,
                'unread_count' => $isMember ? $room->messages()->where('user_id', '!=', $user->id)->whereDoesntHave('reads', function ($query) use ($user) {
                    $query->where('user_id', $user->id);
                })->count() : 0,
                'members' => $room->members->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'name' => $member->name,
                        'avatar' => $member->avatar_url,
                        'is_online' => $member->is_online,
                        'role' => $member->role,
                        'organization' => $member->organization ? ['id' => $member->organization->id, 'name' => $member->organization->name] : null,
                    ];
                }),
                'is_member' => $isMember,
                'created_by' => $room->created_by,
                'topics' => $room->topics->map(function ($topic) {
                    return [
                        'id' => $topic->id,
                        'name' => $topic->name,
                        'description' => $topic->description,
                    ];
                }),
            ];
        })
            ->sortByDesc(function ($room) {
                return $room['last_message']['created_at'] ?? $room['created_at'];
            })
            ->values();

        // Get all active topics for the create room dialog
        $allTopics = ChatTopic::active()->get()->map(function ($topic) {
            return [
                'id' => $topic->id,
                'name' => $topic->name,
                'description' => $topic->description,
            ];
        });

        $allUsers = User::with('organization')
            ->where('id', '!=', $user->id)
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'avatar' => $user->avatar_url,
                    'is_online' => $user->is_online,
                    'role' => $user->role,
                    'organization' => $user->organization ? [
                        'id' => $user->organization->id,
                        'name' => $user->organization->name
                    ] : null,
                ];
            });

        $currentUser = [
            'id' => $user->id,
            'name' => $user->name,
            'avatar' => $user->avatar_url,
            'is_online' => $user->is_online,
            'role' => $user->role,
            'organization' => $user->organization ? ['id' => $user->organization->id, 'name' => $user->organization->name] : null,
            'interestedTopics' => $user->interestedTopics->map(function ($topic) {
                return [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'description' => $topic->description,
                ];
            }),
        ];

        return Inertia::render('chat/index', [
            'chatRooms' => $chatRooms,
            'allUsers' => $allUsers,
            'allTopics' => $allTopics,
            'currentUser' => $currentUser,
        ]);
    }

    public function getMessages(Request $request, ChatRoom $chatRoom)
    {
        $user = auth()->user();

        // For public rooms, auto-join the user if not already a member
        if ($chatRoom->type === 'public') {
            if (!$chatRoom->members()->where('user_id', $user->id)->exists()) {
                $chatRoom->members()->attach($user->id, [
                    'role' => 'member',
                    'joined_at' => now(),
                ]);
            }
        } else {
            // For private/direct rooms, check membership
            if (!$chatRoom->members()->where('user_id', $user->id)->exists()) {
                abort(403, 'You are not a member of this chat room');
            }
        }

        $page = $request->get('page', 1);
        $perPage = 20;
        $messages = $chatRoom->messages()
            ->with(['user.organization', 'replyToMessage.user.organization'])
            ->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page);

        $transformedMessages = collect($messages->items())->map(function ($message) {
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
                    'role' => $message->user->role,
                    'organization' => $message->user->organization ? ['id' => $message->user->organization->id, 'name' => $message->user->organization->name] : null,
                ],
                'reply_to_message' => $message->replyToMessage ? [
                    'id' => $message->replyToMessage->id,
                    'message' => $message->replyToMessage->message,
                    'user' => [
                        'name' => $message->replyToMessage->user->name,
                    ],
                ] : null,
            ];
        });

        return response()->json([
            'messages' => $transformedMessages,
            'has_more' => $messages->hasMorePages(),
            'current_page' => $messages->currentPage(),
        ]);
    }

    public function sendMessage(Request $request, int $id)
    {
        $chatRoom = ChatRoom::findOrFail($id);

        $request->validate([
            'message' => 'nullable|string|max:2000',
            'attachments.*' => 'nullable|file|max:10240', // Max 10MB per file
            'reply_to_message_id' => 'nullable|exists:chat_messages,id',
        ]);

        if (!$request->filled('message') && !$request->hasFile('attachments')) {
            return response()->json(['error' => 'Message or attachment is required.'], 422);
        }

        // Check if user is member of this chat room
        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            abort(403, 'You are not a member of this chat room');
        }

        $attachmentsData = [];
        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('chat_attachments', 'public');
                $attachmentsData[] = [
                    'name' => $file->getClientOriginalName(),
                    'url' => Storage::url($path),
                    'type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                ];
            }
        }

        $message = $chatRoom->messages()->create([
            'user_id' => auth()->id(),
            'message' => $request->input('message'),
            'attachments' => $attachmentsData,
            'reply_to_message_id' => $request->input('reply_to_message_id'),
        ]);

        // Mark message as read by sender
        $message->reads()->attach(auth()->id());

        broadcast(new MessageSent($message));

        SendChatMessageNotification::dispatch($message);

        return response()->json(['message' => $message->load('user.organization', 'replyToMessage.user.organization')]);
    }

    public function deleteMessage(ChatMessage $message)
    {
        // Only allow sender to delete their own message
        if ($message->user_id !== auth()->id()) {
            abort(403, 'You are not authorized to delete this message.');
        }

        // Delete attachments from storage
        if ($message->attachments) {
            foreach ($message->attachments as $attachment) {
                $path = str_replace(Storage::url(''), '', $attachment['url']);
                Storage::disk('public')->delete($path);
            }
        }

        $message->delete();

        return response()->json(['message' => 'Message deleted successfully.']);
    }

    public function markRoomAsRead(ChatRoom $chatRoom)
    {
        $user = auth()->user();
        $unreadMessages = $chatRoom->messages()->where('user_id', '!=', $user->id)->whereDoesntHave('reads', function ($query) use ($user) {
            $query->where('user_id', $user->id);
        })->get();

        foreach ($unreadMessages as $message) {
            $message->reads()->attach($user->id);
        }

        return response()->json(['status' => 'Room marked as read.']);
    }

    public function createRoom(Request $request)
    {
        $user = auth()->user();

        // Check room creation limits based on role
        $publicRoomCount = ChatRoom::where('created_by', $user->id)
            ->where('type', 'public')
            ->count();

        if ($user->role === 'user' && $publicRoomCount >= 5) {
            abort(403, 'You can only create up to 5 public chat rooms as a regular user.');
        }

        if ($user->role === 'organization' && $publicRoomCount >= 10) {
            abort(403, 'You can only create up to 10 public chat rooms as an organization.');
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'type' => ['required', Rule::in(['public', 'private'])],
            'image' => 'nullable|image|max:2048',
            'members' => 'nullable|array',
            'members.*' => 'exists:users,id',
            'topic_id' => 'required|exists:chat_topics,id',
        ]);

        $imageUrl = null;
        if ($request->hasFile('image')) {
            $imageUrl = Storage::url($request->file('image')->store('chat_room_images', 'public'));
        }

        $room = DB::transaction(function () use ($request, $imageUrl, $user) {
            $room = ChatRoom::create([
                'name' => $request->input('name'),
                'description' => $request->input('description'),
                'type' => $request->input('type'),
                'image_url' => $imageUrl,
                'created_by' => $user->id,
            ]);

            // Attach the topic
            $room->topics()->attach($request->input('topic_id'));

            // Add creator as a member
            $room->members()->attach($user->id);

            // Add specified members for private rooms only
            if ($request->input('type') === 'private' && $request->has('members')) {
                $room->members()->attach($request->input('members'));
            }

            return $room;
        });

        $room->load('members', 'topics');

        if ($room->type === 'public') {
            // Get all admin users
            $admins = User::where('role', 'admin')->get();

            // Get regular users interested in this room's topics
            $interestedUsers = User::where('role', '!=', 'admin')
                ->whereHas('interestedTopics', function ($query) use ($room) {
                    $query->whereIn('chat_topics.id', $room->topics->pluck('id'));
                })->get();

            // Combine both collections and remove duplicates
            $recipients = $admins->merge($interestedUsers)->unique('id');

            // First broadcast to general public channel
            broadcast(new RoomCreated($room));

            // Then send to specific users who should get notifications
            foreach ($recipients as $user) {
                broadcast(new RoomCreated($room))->toOthers();
            }
        } else {
            // For private rooms, broadcast only to members
            broadcast(new RoomCreated($room));
        }

        return response()->json(['room' => $room->load('members.organization', 'latestMessage.user', 'topics')]);
    }

    // Add this new method to get topics
    public function getTopics()
    {
        $topics = ChatTopic::active()->get();

        return response()->json([
            'topics' => $topics->map(function ($topic) {
                return [
                    'id' => $topic->id,
                    'name' => $topic->name,
                    'description' => $topic->description,
                ];
            })
        ]);
    }

    public function createDirectChat(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id|different:' . auth()->id(),
        ]);

        $user1 = auth()->user();
        $user2 = User::find($request->input('user_id'));

        // Check if a direct chat already exists between these two users
        $existingRoom = ChatRoom::where('type', 'direct')
            ->whereHas('members', function ($query) use ($user1, $user2) {
                $query->whereIn('user_id', [$user1->id, $user2->id]);
            }, '=', 2)
            ->first();

        // dd($existingRoom);

        if ($existingRoom) {
            return response()->json(['room' => $existingRoom->load('members.organization', 'latestMessage.user')]);
        }

        $room = DB::transaction(function () use ($user1, $user2) {
            $room = ChatRoom::create([
                'name' => 'Direct Chat', // Name will be dynamically set on frontend
                'type' => 'direct',
                'created_by' => $user1->id,
            ]);

            $room->members()->attach([$user1->id, $user2->id]);

            return $room;
        });

        $room->load('members');

        // Broadcast the new room
        broadcast(new RoomCreated($room))->toOthers();

        return response()->json(['room' => $room->load('members.organization', 'latestMessage.user')]);
    }

    public function joinRoom(ChatRoom $chatRoom)
    {
        if ($chatRoom->type === 'private' && !in_array(auth()->user()->role, ['admin', 'organization'])) {
            abort(403, 'You cannot join a private room without being invited or having admin privileges.');
        }

        if ($chatRoom->members()->where('user_id', auth()->id())->exists()) {
            return response()->json(['message' => 'Already a member.']);
        }

        $chatRoom->members()->attach(auth()->id());

        broadcast(new MemberJoined($chatRoom, auth()->user()));

        return response()->json(['message' => 'Joined room successfully.']);
    }

    public function leaveRoom(ChatRoom $chatRoom)
    {
        $user = auth()->user();

        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            return response()->json(['message' => 'Not a member of this room.']);
        }

        // Prevent creator from leaving if they are the only member
        if ($chatRoom->created_by === auth()->id() && $chatRoom->members()->count() === 1) {
            return response()->json(['error' => 'You cannot leave a room you created if you are the only member.'], 403);
        }

        $chatRoom->members()->detach(auth()->id());

        // Broadcast the member left event
        broadcast(new MemberLeft($chatRoom->id, $user->id))->toOthers();

        // If it's a direct chat and one user leaves, delete the room
        if ($chatRoom->type === 'direct' && $chatRoom->members()->count() === 0) {
            $chatRoom->delete();
        }

        return response()->json(['message' => 'Left room successfully.']);
    }

    public function setTypingStatus(Request $request, int $id)
    {
        $chatRoom = ChatRoom::findOrFail($id);

        $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        // Check if user is member of this chat room
        if (!$chatRoom->members()->where('user_id', auth()->id())->exists()) {
            abort(403, 'You are not a member of this chat room');
        }

        broadcast(new UserTyping(auth()->user(), $chatRoom->id, $request->input('is_typing')));

        return response()->json(['status' => 'Typing status updated.']);
    }

    public function addMembers(Request $request, ChatRoom $chatRoom)
    {
        // Only private rooms can have members added
        if ($chatRoom->type !== 'private') {
            abort(403, 'Members can only be added to private chat rooms.');
        }

        // Only creator or admin can add members
        if ($chatRoom->created_by !== auth()->id() && !in_array(auth()->user()->role, ['admin', 'organization'])) {
            abort(403, 'You are not authorized to add members to this chat room.');
        }

        $request->validate([
            'members' => 'required|array',
            'members.*' => 'exists:users,id',
        ]);

        $chatRoom->members()->syncWithoutDetaching($request->input('members'));

        broadcast(new RoomCreated($chatRoom))->toOthers();

        return response()->json(['message' => 'Members added successfully.']);
    }
}
