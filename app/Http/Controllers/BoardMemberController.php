<?php

namespace App\Http\Controllers;

use App\Models\BoardMember;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\BoardMemberInvitation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Inertia\Inertia;

class BoardMemberController extends Controller
{
    public function index()
    {
        // dd(Auth::user()->id);
        $organization = Organization::where("user_id" , Auth::user()->id)->firstOrFail();

        $this->authorize('viewAny', [BoardMember::class, $organization]);

        $boardMembers = $organization->boardMembers()
            ->with('user')
            ->get();

        return Inertia::render('board-members/index', [
            'organization' => $organization,
            'boardMembers' => $boardMembers
        ]);
    }

    public function store(Request $request)
    {
        $organization = Organization::where("user_id", Auth::user()->id)->firstOrFail();

        $this->authorize('create', [BoardMember::class, $organization]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'position' => 'required|string|max:255',
        ]);

        // Check if user exists
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Create new user with random password
            $password = Str::random(12);
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($password),
                'role' => 'organization' // Or a specific role for board members
            ]);

            $user->assignRole('organization');

            // Send invitation email with credentials
            $user->notify(new BoardMemberInvitation($organization, $password));
        } else {
            // Send notification to existing user
            // $user->notify(new BoardMemberAdded($organization));

            return redirect()->back()->with('error', 'User already exists.');
        }

        // Create board member record
        $boardMember = BoardMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'position' => $request->position,
            'appointed_on' => now(),
        ]);

        // Record history
        $boardMember->histories()->create([
            'action' => 'appointed',
            'details' => "Appointed as {$request->position}",
            'changed_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'Board member added successfully.');
    }

    public function updateStatus(Request $request, BoardMember $boardMember)
    {
        $this->authorize('update', $boardMember);

        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $oldStatus = $boardMember->is_active;
        $boardMember->update(['is_active' => $request->is_active]);

        // Record history
        $action = $request->is_active ? 'reactivated' : 'deactivated';
        $boardMember->histories()->create([
            'action' => 'status_changed',
            'details' => "Status changed from " . ($oldStatus ? 'active' : 'inactive') . " to " . ($request->is_active ? 'active' : 'inactive'),
            'changed_by' => auth()->id(),
        ]);

        return redirect()->back()->with('success', 'Board member status updated successfully.');
    }

    public function destroy(BoardMember $boardMember)
    {
        $this->authorize('delete', $boardMember);

        // Record history before deletion
        $boardMember->histories()->create([
            'action' => 'removed',
            'details' => 'Removed from board',
            'changed_by' => auth()->id(),
        ]);

        $boardMember->delete();

        return redirect()->back()->with('success', 'Board member removed successfully.');
    }
}
