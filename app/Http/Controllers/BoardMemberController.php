<?php

namespace App\Http\Controllers;

use App\Models\BoardMember;
use App\Models\Organization;
use App\Models\User;
use App\Models\IrsBoardMember;
use App\Notifications\BoardMemberInvitation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Carbon\Carbon;

class BoardMemberController extends Controller
{
    public function index()
    {
        $organization = Auth::user()->organization;

        $this->authorize('viewAny', [BoardMember::class, $organization]);

        $boardMembers = $organization->boardMembers()
            ->with('user')
            ->get();

        return Inertia::render('board-members/index', [
            'organization' => $organization,
            'boardMembers' => $boardMembers,
        ]);
    }

    public function store(Request $request)
    {
        $organization = Auth::user()->organization;

        $this->authorize('create', [BoardMember::class, $organization]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'position' => 'required|string|max:255',
            'role' => 'required|string|in:admin,leader'
        ]);

        // Check if current user has permission to assign this role
        $currentUserRole = Auth::user()->organization_role;

        if ($request->role === 'admin' && $currentUserRole !== 'admin') {
            return redirect()->back()->with('error', 'Only admins can create admin users.');
        }

        if ($request->role === 'leader' && !in_array($currentUserRole, ['admin', 'leader'])) {
            return redirect()->back()->with('error', 'You do not have permission to create leader users.');
        }

        // Check if user exists
        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Create new user with random password
            $password = Str::random(12);
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($password),
                'organization_role' => $request->role,
                'role' => 'organization'
            ]);

            $user->assignRole('organization');

            // Send invitation email with credentials
            $user->notify(new BoardMemberInvitation($organization, $password));
        } else {
            // Update existing user's role if they're not already an admin of another organization
            if ($user->organization_role !== 'admin' || $user->organization_id === $organization->id) {
                $user->update([
                    'organization_role' => $request->role,
                    'organization_id' => $organization->id
                ]);
            } else {
                return redirect()->back()->with('error', 'This user is already an admin of another organization.');
            }
        }

        // Verify name against IRS board members
        $verificationStatus = 'pending';
        $verificationNotes = null;
        
        if ($organization->ein) {
            $cleanEIN = preg_replace('/[^0-9]/', '', $organization->ein);
            
            // Fetch IRS board members by EIN ONLY (no tax year filter)
            $irsBoardMembers = IrsBoardMember::where('ein', $cleanEIN)
                ->where('status', 'active')
                ->get();
            
            if ($irsBoardMembers->isNotEmpty()) {
                // Check if name matches exactly (case-insensitive)
                $nameMatch = false;
                $userName = strtolower(trim($request->name));
                
                foreach ($irsBoardMembers as $irsMember) {
                    $irsName = strtolower(trim($irsMember->name));
                    if ($userName === $irsName) {
                        $nameMatch = true;
                        break;
                    }
                }
                
                if ($nameMatch) {
                    $verificationStatus = 'verified';
                    $verificationNotes = "Verified against IRS Form 990. Name matched in IRS data (checked all tax years).";
                } else {
                    $verificationStatus = 'not_found';
                    $verificationNotes = "Not found in IRS Form 990 data. Name does not match any active board members in IRS filing (checked all tax years).";
                }
            } else {
                // No IRS data available (all tax years)
                $verificationStatus = 'not_found';
                $verificationNotes = "No active IRS board members found in database (checked all tax years). EIN may not be in IRS filing data.";
            }
        }

        // Create board member record
        $boardMember = BoardMember::create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'position' => $request->position,
            'is_active' => $verificationStatus !== 'not_found', // Deactivate if not found
            'verification_status' => $verificationStatus,
            'verification_notes' => $verificationNotes,
            'verified_at' => $verificationStatus !== 'pending' ? now() : null,
            'appointed_on' => now(),
        ]);

        // Record history
        $boardMember->histories()->create([
            'action' => 'appointed',
            'details' => "Appointed as {$request->position} with role: {$request->role}",
            'changed_by' => auth()->id(),
        ]);

        $message = 'Board member added successfully.';
        if ($verificationStatus === 'not_found') {
            $message .= ' Note: This member was not found in IRS data and has been automatically deactivated.';
        } elseif ($verificationStatus === 'verified') {
            $message .= ' Member verified against IRS data.';
        }

        return redirect()->back()->with('success', $message);
    }

    public function updateStatus(Request $request, BoardMember $boardMember)
    {
        $this->authorize('update', $boardMember);

        // Prevent deactivating the only active admin
        if ($boardMember->user->organization_role === 'admin' && !$request->is_active) {
            $activeAdmins = BoardMember::where('organization_id', $boardMember->organization_id)
                ->whereHas('user', function ($query) {
                    $query->where('organization_role', 'admin');
                })
                ->where('is_active', true)
                ->count();

            if ($activeAdmins <= 1) {
                return redirect()->back()->with('error', 'Cannot deactivate the only active admin.');
            }
        }

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

        // Prevent deleting admin users
        if ($boardMember->user->organization_role === 'admin') {
            return redirect()->back()->with('error', 'Admin users cannot be removed.');
        }

        // Prevent deleting if user is organization admin
        if (Organization::where('user_id', $boardMember->user_id)->exists()) {
            return redirect()->back()->with('error', 'Cannot remove board member who is also an organization admin.');
        }

        // Check if this is the only active admin (additional safety check)
        if ($boardMember->user->organization_role === 'admin') {
            $activeAdmins = BoardMember::where('organization_id', $boardMember->organization_id)
                ->whereHas('user', function ($query) {
                    $query->where('organization_role', 'admin');
                })
                ->where('is_active', true)
                ->count();

            if ($activeAdmins <= 1) {
                return redirect()->back()->with('error', 'Cannot remove the only active admin.');
            }
        }

        // Record history before deletion
        $boardMember->histories()->create([
            'action' => 'removed',
            'details' => 'Removed from board',
            'changed_by' => auth()->id(),
        ]);

        // Only delete the user if they don't have any other organization associations
        $userBoardMemberships = BoardMember::where('user_id', $boardMember->user_id)->count();

        if ($userBoardMemberships <= 1) {
            // Remove organization association but don't delete the user account
            $boardMember->user->update([
                'organization_role' => 'member',
                'organization_id' => null
            ]);
        }

        $boardMember->delete();

        return redirect()->back()->with('success', 'Board member removed successfully.');
    }

}
