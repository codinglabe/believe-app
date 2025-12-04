<?php

namespace App\Http\Controllers;

use App\Models\EmailConnection;
use App\Models\EmailContact;
use App\Models\Organization;
use App\Services\GmailService;
use App\Services\OutlookService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use App\Jobs\SyncEmailContacts;

class EmailInviteController extends BaseController
{
    /**
     * Show the invite friends page
     */
    public function index(Request $request)
    {
        $this->authorizePermission($request, 'email.invite.read');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            abort(404, 'Organization not found');
        }

        $connections = $organization->emailConnections()->with('contacts')->get();
        
        // Get pagination and filter parameters from request
        $perPage = $request->input('per_page', 50); // Default to 50 for initial load
        $page = $request->input('page', 1);
        $search = $request->input('search', '');
        $provider = $request->input('provider', 'all');
        
        $query = $organization->emailContacts()
            ->with('emailConnection');
        
        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'LIKE', "%{$search}%")
                    ->orWhere('name', 'LIKE', "%{$search}%");
            });
        }
        
        // Apply provider filter
        if ($provider && $provider !== 'all') {
            $query->whereHas('emailConnection', function ($q) use ($provider) {
                $q->where('provider', $provider);
            });
        }
        
        $contacts = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        return Inertia::render('EmailInvite/Index', [
            'connections' => $connections->map(function ($connection) {
                return [
                    'id' => $connection->id,
                    'provider' => $connection->provider,
                    'email' => $connection->email,
                    'is_active' => $connection->is_active,
                    'is_syncing' => $connection->is_syncing,
                    'last_synced_at' => $connection->last_synced_at?->toDateTimeString(),
                    'contacts_count' => $connection->contacts()->count(),
                ];
            }),
            'contacts' => $contacts,
            'filters' => [
                'search' => $search,
                'provider' => $provider,
                'per_page' => (int) $perPage,
                'page' => (int) $page,
            ],
        ]);
    }

    /**
     * Initiate OAuth flow for Gmail
     */
    public function connectGmail(Request $request)
    {
        $this->authorizePermission($request, 'email.invite.create');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        try {
            // Create a temporary connection record
            $connection = EmailConnection::create([
                'organization_id' => $organization->id,
                'provider' => 'gmail',
                'is_active' => false,
            ]);

            $gmailService = new GmailService($connection);
            $authUrl = $gmailService->getAuthUrl();

            // Store connection ID in session for callback
            session(['email_connection_id' => $connection->id]);

            // Redirect to OAuth URL
            return redirect($authUrl);
        } catch (\Exception $e) {
            Log::error('Gmail connect error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initiate Gmail connection'], 500);
        }
    }

    /**
     * Initiate OAuth flow for Outlook
     */
    public function connectOutlook(Request $request)
    {
        $this->authorizePermission($request, 'email.invite.create');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        try {
            // Create a temporary connection record
            $connection = EmailConnection::create([
                'organization_id' => $organization->id,
                'provider' => 'outlook',
                'is_active' => false,
            ]);

            $outlookService = new OutlookService($connection);
            $authUrl = $outlookService->getAuthUrl();

            // Store connection ID in session for callback
            session(['email_connection_id' => $connection->id]);

            // Redirect to OAuth URL
            return redirect($authUrl);
        } catch (\Exception $e) {
            Log::error('Outlook connect error: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to initiate Outlook connection'], 500);
        }
    }

    /**
     * Handle OAuth callback
     */
    public function callback(Request $request)
    {
        $code = $request->query('code');
        $error = $request->query('error');

        if ($error) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Authorization failed: ' . $error);
        }

        if (!$code) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Authorization code not provided');
        }

        $connectionId = session('email_connection_id');
        if (!$connectionId) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Connection session expired');
        }

        $connection = EmailConnection::find($connectionId);
        if (!$connection) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Connection not found');
        }

        try {
            if ($connection->provider === 'gmail') {
                $service = new GmailService($connection);
                $tokenData = $service->handleCallback($code);
            } else {
                $service = new OutlookService($connection);
                $tokenData = $service->handleCallback($code);
            }

            $connection->update([
                'access_token' => $tokenData['access_token'],
                'refresh_token' => $tokenData['refresh_token'],
                'id_token' => $tokenData['id_token'] ?? null,
                'token_expires_at' => $tokenData['token_expires_at'],
                'email' => $tokenData['email'],
                'token_metadata' => $tokenData['token_metadata'],
                'is_active' => true,
            ]);

            session()->forget('email_connection_id');

            return redirect()->route('email-invite.index')
                ->with('success', 'Email account connected successfully!');
        } catch (\Exception $e) {
            Log::error('OAuth callback error: ' . $e->getMessage());
            $connection->delete();
            return redirect()->route('email-invite.index')
                ->with('error', 'Failed to connect email account: ' . $e->getMessage());
        }
    }

    /**
     * Sync contacts from connected email account
     */
    public function syncContacts(Request $request, EmailConnection $connection)
    {
        $this->authorizePermission($request, 'email.invite.sync');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization || $connection->organization_id !== $organization->id) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Unauthorized');
        }

        // Check if already syncing
        if ($connection->is_syncing) {
            return redirect()->route('email-invite.index')
                ->with('info', 'Sync is already in progress. Please wait...');
        }

        // Set syncing flag
        $connection->update(['is_syncing' => true]);

        // Dispatch job to sync contacts in the background
        SyncEmailContacts::dispatch($connection, $organization);
        
        Log::info("Email contacts sync job dispatched for connection {$connection->id}");

        // Return Inertia response
        return redirect()->route('email-invite.index')
            ->with('success', 'Sync started. This may take a few moments...');
    }

    /**
     * Check sync job status
     */
    public function checkSyncStatus(Request $request, EmailConnection $connection)
    {
        $this->authorizePermission($request, 'email.invite.sync');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization || $connection->organization_id !== $organization->id) {
            return redirect()->route('email-invite.index')
                ->with('error', 'Unauthorized');
        }

        // Refresh the connection to get latest data
        $connection->refresh();
        
        // Get all connections for the response
        $connections = $organization->emailConnections()->with('contacts')->get();
        
        // Get pagination and filter parameters from request (same as index method)
        $perPage = $request->input('per_page', 50);
        $page = $request->input('page', 1);
        $search = $request->input('search', '');
        $provider = $request->input('provider', 'all');
        
        $query = $organization->emailContacts()
            ->with('emailConnection');
        
        // Apply search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'LIKE', "%{$search}%")
                    ->orWhere('name', 'LIKE', "%{$search}%");
            });
        }
        
        // Apply provider filter
        if ($provider && $provider !== 'all') {
            $query->whereHas('emailConnection', function ($q) use ($provider) {
                $q->where('provider', $provider);
            });
        }
        
        $contacts = $query->orderBy('created_at', 'desc')
            ->paginate($perPage, ['*'], 'page', $page)
            ->withQueryString();

        // Return Inertia response with updated connections and contacts
        return Inertia::render('EmailInvite/Index', [
            'connections' => $connections->map(function ($conn) {
                return [
                    'id' => $conn->id,
                    'provider' => $conn->provider,
                    'email' => $conn->email,
                    'is_active' => $conn->is_active,
                    'is_syncing' => $conn->is_syncing,
                    'last_synced_at' => $conn->last_synced_at?->toDateTimeString(),
                    'contacts_count' => $conn->contacts()->count(),
                ];
            }),
            'contacts' => $contacts,
            'filters' => [
                'search' => $search,
                'provider' => $provider,
                'per_page' => (int) $perPage,
                'page' => (int) $page,
            ],
        ]);
    }

    /**
     * Get contacts for selection
     */
    public function getContacts(Request $request)
    {
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        $contacts = $organization->emailContacts()
            ->where('invite_sent', false)
            ->orderBy('name')
            ->orderBy('email')
            ->get()
            ->map(function ($contact) {
                return [
                    'id' => $contact->id,
                    'email' => $contact->email,
                    'name' => $contact->name,
                ];
            });

        return response()->json($contacts);
    }

    /**
     * Send invites to selected contacts
     */
    public function sendInvites(Request $request)
    {
        $this->authorizePermission($request, 'email.invite.send');
        
        $request->validate([
            'contact_ids' => 'required|array',
            'contact_ids.*' => 'exists:email_contacts,id',
            'message' => 'nullable|string|max:1000',
        ]);

        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization) {
            return response()->json(['error' => 'Organization not found'], 404);
        }

        $contactIds = $request->input('contact_ids');
        $contacts = EmailContact::whereIn('id', $contactIds)
            ->where('organization_id', $organization->id)
            ->where('invite_sent', false)
            ->get();

        if ($contacts->isEmpty()) {
            return response()->json(['error' => 'No valid contacts selected'], 400);
        }

        // Dispatch job to send invites in the background
        \App\Jobs\SendEmailInvites::dispatch($contacts, $organization, $request->input('message'));

        Log::info("Email invites job dispatched for {$contacts->count()} contacts to organization {$organization->id}");

        return redirect()->route('email-invite.index')
            ->with('success', "Invite requests queued for {$contacts->count()} contact(s). Emails will be sent in the background.");
    }

    /**
     * Disconnect email account
     */
    public function disconnect(Request $request, EmailConnection $connection)
    {
        $this->authorizePermission($request, 'email.invite.delete');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization || $connection->organization_id !== $organization->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $connection->delete();

        return redirect()->route('email-invite.index')
            ->with('success', 'Email account disconnected');
    }

    /**
     * Delete a contact
     */
    public function deleteContact(Request $request, EmailContact $contact)
    {
        $this->authorizePermission($request, 'email.invite.delete');
        
        $user = $request->user();
        $organization = Organization::where('user_id', $user->id)->first();

        if (!$organization || $contact->organization_id !== $organization->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $contact->delete();

        if ($request->expectsJson() || $request->wantsJson()) {
            return response()->json(['success' => true, 'message' => 'Contact deleted successfully']);
        }

        return redirect()->route('email-invite.index')
            ->with('success', 'Contact deleted successfully');
    }
}
