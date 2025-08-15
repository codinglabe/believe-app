<?php

namespace App\Http\Controllers;

use App\Models\Meeting;
use App\Models\Course;
use App\Models\MeetingLink;
use App\Models\MeetingParticipant;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Carbon\Carbon;

class MeetingController extends Controller
{
    /**
     * Display a listing of meetings
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $userRole = $user->role;

        $query = Meeting::with(['course', 'instructor']);

        if ($userRole === 'organization') {
            // Show meetings for courses created by this organization
            $query->where('instructor_id', $user->id);
        } else {
            // Show meetings for courses the user is enrolled in
            $query->whereHas('course.enrollments', function ($q) use ($user) {
                $q->where('user_id', $user->id)->where('status', 'active');
            });
        }

        // Apply filters
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('course', function ($courseQuery) use ($search) {
                      $courseQuery->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $meetings = $query->orderBy('scheduled_at', 'desc')->paginate(12);

        // Add join URLs for students
        if ($userRole !== 'nonprofit') {
            $meetings->getCollection()->transform(function ($meeting) use ($user) {
                $studentLink = $meeting->getStudentLink($user);
                $meeting->join_url = $studentLink ? $studentLink->getJoinUrl() : null;
                return $meeting;
            });
        }

        return Inertia::render('meetings/Index', [
            'meetings' => $meetings,
            'userRole' => $userRole,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    /**
     * Show the form for creating a new meeting
     */
    public function create()
    {
        $user = Auth::user();
        
        // Get courses created by this nonprofit
        $courses = Course::where('organization_id', $user->id)
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('meetings/Create', [
            'courses' => $courses,
        ]);
    }

    /**
     * Store a newly created meeting
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'required|date|after:now',
            'duration_minutes' => 'required|integer|min:15|max:480',
            'max_participants' => 'nullable|integer|min:1|max:100',
            'is_recording_enabled' => 'boolean',
            'is_chat_enabled' => 'boolean',
            'is_screen_share_enabled' => 'boolean',
            'meeting_password' => 'nullable|string|max:20',
        ]);

        $user = Auth::user();
        $course = Course::findOrFail($validated['course_id']);

        // Verify user owns this course
        if ($course->organization_id !== $user->id) {
            abort(403, 'You can only create meetings for your own courses.');
        }

        try {
            DB::beginTransaction();

            $meeting = Meeting::create([
                'course_id' => $course->id,
                'instructor_id' => $user->id,
                'title' => $validated['title'],
                'description' => $validated['description'],
                'meeting_id' => Meeting::generateMeetingId(),
                'scheduled_at' => $validated['scheduled_at'],
                'duration_minutes' => $validated['duration_minutes'],
                'status' => 'scheduled',
                'max_participants' => $validated['max_participants'],
                'is_recording_enabled' => $validated['is_recording_enabled'] ?? true,
                'is_chat_enabled' => $validated['is_chat_enabled'] ?? true,
                'is_screen_share_enabled' => $validated['is_screen_share_enabled'] ?? true,
                'meeting_password' => $validated['meeting_password'],
            ]);

            // Generate meeting links
            $meeting->generateLinks();

            DB::commit();

            return redirect()->route('meetings.index')
                ->with('success', 'Meeting created successfully!');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create meeting: ' . $e->getMessage());
            
            return redirect()->back()
                ->withInput()
                ->withErrors(['error' => 'Failed to create meeting. Please try again.']);
        }
    }

    /**
     * Display the specified meeting
     */
    public function show(Meeting $meeting)
    {
        $user = Auth::user();

        // Check if user can view this meeting
        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to view this meeting.');
        }

        $meeting->load(['course', 'instructor', 'participants.user', 'recordings']);

        // Get meeting links
        $hostLink = $meeting->getHostLink();
        $studentLink = $user->id !== $meeting->instructor_id ? $meeting->getStudentLink($user) : null;

        // Get organization/user links
        $organizationLink = $user->role === 'nonprofit' ? $meeting->getOrganizationLink($user) : null;
        $userLink = $user->role !== 'nonprofit' && $user->id !== $meeting->instructor_id ? $meeting->getUserLink($user) : null;

        // Get attendance statistics
        $attendanceStats = [
            'total_participants' => $meeting->participants()->distinct('user_id')->count(),
            'current_participants' => $meeting->participants()->where('status', 'joined')->count(),
            'total_duration' => $meeting->attendances()->sum('duration_minutes'),
            'average_duration' => $meeting->attendances()->avg('duration_minutes') ?: 0,
        ];

        return Inertia::render('meetings/Show', [
            'meeting' => $meeting,
            'hostLink' => $hostLink,
            'studentLink' => $studentLink,
            'organizationLink' => $organizationLink,
            'userLink' => $userLink,
            'attendanceStats' => $attendanceStats,
            'isInstructor' => $user->id === $meeting->instructor_id,
        ]);
    }

    /**
     * Join meeting via token
     */
    public function join(Request $request, string $token)
    {
        $meetingLink = MeetingLink::where('token', $token)->first();

        if (!$meetingLink || !$meetingLink->isValid()) {
            return redirect()->route('meetings.index')
                ->withErrors(['error' => 'Invalid or expired meeting link.']);
        }

        $user = Auth::user();
        $meeting = $meetingLink->meeting;

        // Verify user matches the link
        if ($meetingLink->user_id !== $user->id) {
            abort(403, 'This meeting link is not assigned to you.');
        }

        // Record access
        $meetingLink->recordAccess($request->ip(), $request->userAgent());

        // Add user as participant if not already joined
        $existingParticipant = $meeting->participants()
            ->where('user_id', $user->id)
            ->where('status', 'joined')
            ->first();
        
        if (!$existingParticipant) {
            $meeting->addParticipant($user);
        }

        return Inertia::render('meetings/Room', [
            'meeting' => $meeting->load(['course', 'instructor']),
            'user' => $user,
            'role' => $meetingLink->role,
            'meetingLink' => $meetingLink,
        ]);
    }

    /**
     * Join meeting directly (for WebRTC)
     */
    public function joinMeeting(Meeting $meeting)
    {
        $user = Auth::user();

        if (!$meeting->canUserJoin($user)) {
            return response()->json([
                'error' => 'You do not have permission to join this meeting.'
            ], 403);
        }

        try {
            // Add user as participant if not already joined
            $existingParticipant = $meeting->participants()
                ->where('user_id', $user->id)
                ->where('status', 'joined')
                ->first();
            
            if (!$existingParticipant) {
                $meeting->addParticipant($user);
            }

            // Broadcast participant joined event
            event(new \App\Events\ParticipantJoined($meeting, $user));

            return response()->json([
                'success' => true,
                'message' => 'Joined meeting successfully',
                'participant_id' => $user->id,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to join meeting: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to join meeting'
            ], 500);
        }
    }

    /**
     * Update audio status
     */
    public function updateAudio(Meeting $meeting, Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'audio_enabled' => 'required|boolean',
        ]);

        try {
            $participant = $meeting->participants()
                ->where('user_id', $user->id)
                ->where('status', 'joined')
                ->first();

            if ($participant) {
                $participant->update(['is_muted' => !$validated['audio_enabled']]);
                
                // Broadcast audio toggle event
                event(new \App\Events\ParticipantMuted($meeting, $user, !$validated['audio_enabled']));
            }

            return response()->json([
                'success' => true,
                'audio_enabled' => $validated['audio_enabled'],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update audio status: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to update audio status'
            ], 500);
        }
    }

    /**
     * Update video status
     */
    public function updateVideo(Meeting $meeting, Request $request)
    {
        $user = Auth::user();
        
        $validated = $request->validate([
            'video_enabled' => 'required|boolean',
        ]);

        try {
            $participant = $meeting->participants()
                ->where('user_id', $user->id)
                ->where('status', 'joined')
                ->first();

            if ($participant) {
                $participant->update(['is_video_enabled' => $validated['video_enabled']]);
            }

            return response()->json([
                'success' => true,
                'video_enabled' => $validated['video_enabled'],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update video status: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to update video status'
            ], 500);
        }
    }

    /**
     * Start a meeting
     */
    public function start(Meeting $meeting)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can start the meeting.');
        }

        if ($meeting->status !== 'scheduled') {
            return redirect()->back()
                ->withErrors(['error' => 'Meeting cannot be started in its current state.']);
        }

        $meeting->start();

        return response()->json([
            'success' => true,
            'message' => 'Meeting started successfully',
            'meeting_id' => $meeting->meeting_id,
        ]);
    }

    /**
     * End a meeting
     */
    public function end(Meeting $meeting)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can end the meeting.');
        }

        if ($meeting->status !== 'active') {
            return redirect()->back()
                ->withErrors(['error' => 'Meeting is not currently active.']);
        }

        // $meeting->end();

        return response()->json([
            'success' => true,
            'message' => 'Meeting ended successfully',
        ]);
    }

    /**
     * Remove participant from meeting
     */
    public function removeParticipant(Meeting $meeting, Request $request)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can remove participants.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $participantUser = \App\Models\User::findOrFail($validated['user_id']);
        
        $participant = $meeting->participants()
            ->where('user_id', $participantUser->id)
            ->where('status', 'joined')
            ->first();

        if (!$participant) {
            return response()->json([
                'error' => 'Participant not found or not currently in meeting',
            ], 404);
        }

        $meeting->removeParticipant($participantUser);
        
        event(new \App\Events\ParticipantRemoved($meeting, $participant));

        return response()->json([
            'success' => true,
            'message' => 'Participant removed successfully',
        ]);
    }

    /**
     * Mute/unmute participant
     */
    public function muteParticipant(Meeting $meeting, Request $request)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can mute participants.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'muted' => 'required|boolean',
        ]);

        $participant = $meeting->participants()
            ->where('user_id', $validated['user_id'])
            ->where('status', 'joined')
            ->first();

        if (!$participant) {
            return response()->json([
                'error' => 'Participant not found or not currently in meeting',
            ], 404);
        }

        if ($validated['muted']) {
            $participant->mute();
        } else {
            $participant->unmute();
        }

        return response()->json([
            'success' => true,
            'message' => 'Participant ' . ($validated['muted'] ? 'muted' : 'unmuted') . ' successfully',
        ]);
    }

    /**
     * Get meeting participants
     */
    public function participants(Meeting $meeting)
    {
        $user = Auth::user();

        if (!$meeting->canUserJoin($user)) {
            abort(403, 'You do not have permission to view meeting participants.');
        }

        $participants = $meeting->participants()
            ->with('user:id,name,email')
            ->where('status', 'joined')
            ->get();

        return response()->json([
            'participants' => $participants,
        ]);
    }

    /**
     * Leave meeting
     */
    public function leave(Meeting $meeting)
    {
        $user = Auth::user();
        $meeting->removeParticipant($user);

        return response()->json([
            'success' => true,
            'message' => 'Left meeting successfully',
        ]);
    }

    /**
     * Regenerate meeting links
     */
    public function regenerateLinks(Meeting $meeting)
    {
        $user = Auth::user();

        if ($user->id !== $meeting->instructor_id) {
            abort(403, 'Only the instructor can regenerate meeting links.');
        }

        try {
            DB::beginTransaction();

            // Deactivate existing links
            $meeting->meetingLinks()->update(['is_active' => false]);

            // Generate new links
            $meeting->generateLinks();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Meeting links regenerated successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to regenerate meeting links: ' . $e->getMessage());
            
            return response()->json([
                'error' => 'Failed to regenerate meeting links',
            ], 500);
        }
    }
}
