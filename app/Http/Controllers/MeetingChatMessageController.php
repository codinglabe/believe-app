<?php

namespace App\Http\Controllers;

use App\Events\MeetingMessageDeleted as MessageDeleted;
use App\Events\MeetingMessageSent as MessageSent;
use App\Events\EmojiReaction;
use App\Events\MeetingMessageSent;
use App\Models\MeetingChatMessage as ChatMessage;
use App\Models\Meeting;
use App\Models\MeetingParticipant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class MeetingChatMessageController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Send a chat message
     */
    public function store(Request $request, Meeting $meeting)
    {
        $user = Auth::user();

        // Check if user can participate in this meeting
        if (!$this->canUserAccessMeeting($user, $meeting)) {
            abort(403, 'You do not have permission to send messages in this meeting.');
        }

        // Check if chat is enabled
        if (!$meeting->is_chat_enabled) {
            return response()->json([
                'error' => 'Chat is disabled for this meeting',
            ], 403);
        }

        $validated = $request->validate([
            'message' => 'required|string|max:1000',
            'message_type' => 'in:text,emoji,file,system|nullable',
            'is_private' => 'boolean',
            'recipient_id' => 'nullable|exists:users,id|required_if:is_private,true',
            'metadata' => 'nullable|array',
        ]);

        // If private message, verify recipient is in the meeting
        if ($validated['is_private'] ?? false) {
            $recipientInMeeting = MeetingParticipant::where('meeting_id', $meeting->id)
                ->where('user_id', $validated['recipient_id'])
                ->where('status', 'joined')
                ->exists();

            if (!$recipientInMeeting) {
                return response()->json([
                    'error' => 'Recipient is not in the meeting',
                ], 400);
            }
        }

        try {
            $message = ChatMessage::create([
                'meeting_id' => $meeting->id,
                'user_id' => $user->id,
                'message' => $validated['message'],
                'message_type' => $validated['message_type'] ?? 'text',
                'is_private' => $validated['is_private'] ?? false,
                'recipient_id' => $validated['recipient_id'] ?? null,
                'metadata' => $validated['metadata'] ?? null,
            ]);

            $message->load(['user', 'recipient:id,name,email']);

            // Broadcast the message using Laravel Reverb
            broadcast(new MeetingMessageSent($message))->toOthers();

            return response()->json([
                'success' => true,
                'user'=> $message->user,
                'message' => [
                    'id' => $message->id,
                    'content' => $message->message,
                    'user' => [
                        'id' => $message->user->id,
                        'name' => $message->user->name,
                        'avatar' => $message->user->getProfilePhotoUrlAttribute(),
                        'role' => $this->getUserRole($message->user),
                    ],
                    'type' => $message->message_type,
                    'timestamp' => $message->created_at,
                    'created_at' => $message->created_at,
                    'is_private' => $message->is_private,
                    'metadata' => $message->metadata,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send chat message: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to send message',
            ], 500);
        }
    }

    /**
     * Send emoji reaction
     */
    public function sendEmoji(Request $request, Meeting $meeting)
    {
        $user = Auth::user();

        if (!$this->canUserAccessMeeting($user, $meeting)) {
            abort(403, 'You do not have permission to send reactions in this meeting.');
        }

        $validated = $request->validate([
            'emoji' => 'required|string|max:10',
            'reaction_type' => 'in:reaction,message|nullable',
        ]);

        try {
            $message = ChatMessage::create([
                'meeting_id' => $meeting->id,
                'user_id' => $user->id,
                'message' => $validated['emoji'],
                'message_type' => 'emoji',
                'is_private' => false,
                'metadata' => [
                    'reaction_type' => $validated['reaction_type'] ?? 'message',
                ],
            ]);

            $message->load(['user:id,name,email,image']);

            // Broadcast emoji reaction
            broadcast(new EmojiReaction($message))->toOthers();

            return response()->json([
                'success' => true,
                'message' => [
                    'id' => $message->id,
                    'content' => $message->message,
                    'user' => [
                        'id' => $message->user->id,
                        'name' => $message->user->name,
                        'avatar' => $message->user->image,
                        'role' => $this->getUserRole($message->user),
                    ],
                    'type' => $message->message_type,
                    'timestamp' => $message->created_at->format('H:i'),
                    'created_at' => $message->created_at->toISOString(),
                    'metadata' => $message->metadata,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to send emoji reaction: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to send emoji reaction',
            ], 500);
        }
    }

    /**
     * Get chat messages for a meeting
     */
    public function index(Meeting $meeting)
    {
        $user = Auth::user();

        // Check if user can view messages in this meeting
        if (!$this->canUserAccessMeeting($user, $meeting)) {
            abort(403, 'You do not have permission to view messages in this meeting.');
        }

        try {
            $messages = ChatMessage::where('meeting_id', $meeting->id)
                ->where(function ($query) use ($user) {
                    $query->where('is_private', false)
                          ->orWhere('user_id', $user->id)
                          ->orWhere('recipient_id', $user->id);
                })
                ->with(['user:id,name,email,image', 'recipient:id,name,email'])
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function ($message) {
                    return [
                        'id' => $message->id,
                        'content' => $message->message,
                        'user' => [
                            'id' => $message->user->id,
                            'name' => $message->user->name,
                            'avatar' => $message->user->getProfilePhotoUrlAttribute(),
                            'role' => $this->getUserRole($message->user),
                        ],
                        'type' => $message->message_type,
                        'timestamp' => $message->created_at,
                        'created_at' => $message->created_at,
                        'is_private' => $message->is_private,
                        'metadata' => $message->metadata,
                    ];
                });

            return response()->json([
                'messages' => $messages,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch chat messages: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch messages',
                'messages' => [],
            ], 500);
        }
    }

    /**
     * Delete a chat message
     */
    public function destroy(Meeting $meeting, ChatMessage $message)
    {
        $user = Auth::user();

        // Check if user can delete this message
        if ($message->user_id !== $user->id && !$this->canUserManageMeeting($user, $meeting)) {
            abort(403, 'You can only delete your own messages or messages in meetings you manage.');
        }

        // Verify message belongs to this meeting
        if ($message->meeting_id !== $meeting->id) {
            abort(404, 'Message not found in this meeting.');
        }

        try {
            $messageData = $message->toArray();
            $message->delete();

            // Broadcast message deletion
            broadcast(new MessageDeleted($messageData))->toOthers();

            return response()->json([
                'success' => true,
                'message' => 'Message deleted successfully',
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to delete chat message: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to delete message',
            ], 500);
        }
    }

    /**
     * Get chat history for a meeting (for instructors)
     */
    public function history(Meeting $meeting)
    {
        $user = Auth::user();

        // Only instructors/managers can view full chat history
        if (!$this->canUserManageMeeting($user, $meeting)) {
            abort(403, 'Only meeting managers can view full chat history.');
        }

        try {
            $messages = ChatMessage::where('meeting_id', $meeting->id)
                ->with(['user:id,name,email,image', 'recipient:id,name,email'])
                ->orderBy('created_at', 'asc')
                ->get();

            return response()->json([
                'messages' => $messages,
                'total_messages' => $messages->count(),
                'participants_count' => $messages->pluck('user_id')->unique()->count(),
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch chat history: ' . $e->getMessage());
            return response()->json([
                'error' => 'Failed to fetch chat history',
            ], 500);
        }
    }

    /**
     * Check if user can access meeting
     */
    private function canUserAccessMeeting($user, $meeting)
    {
        // Check if user is the instructor
        if ($meeting->instructor_id === $user->id) {
            return true;
        }

        // Check if user is enrolled in the course
        if ($meeting->course) {
            $isEnrolled = $meeting->course->enrollments()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
            
            if ($isEnrolled) {
                return true;
            }
        }

        // Check if user is a meeting participant
        $isParticipant = MeetingParticipant::where('meeting_id', $meeting->id)
            ->where('user_id', $user->id)
            ->exists();

        return $isParticipant;
    }

    /**
     * Check if user can manage meeting
     */
    private function canUserManageMeeting($user, $meeting)
    {
        // Check if user is the instructor
        if ($meeting->instructor_id === $user->id) {
            return true;
        }

        // Check if user is admin
        if ($user->hasRole && $user->hasRole('admin')) {
            return true;
        }

        // Check if user owns the course
        if ($meeting->course && $meeting->course->instructor_id === $user->id) {
            return true;
        }

        return false;
    }

    /**
     * Get user role in meeting context
     */
    private function getUserRole($user)
    {
        // This would determine the user's role in the meeting
        // You can customize this based on your business logic
        if (method_exists($user, 'hasRole')) {
            if ($user->hasRole('admin')) {
                return 'Host';
            } elseif ($user->hasRole('organization')) {
                return 'Organization';
            } elseif ($user->hasRole('user')) {
                return 'Student';
            }
        }
        
        return 'User';
    }
}
