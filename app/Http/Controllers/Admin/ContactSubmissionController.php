<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\BaseController;
use App\Jobs\SendContactSubmissionReply;
use App\Models\ContactSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ContactSubmissionController extends BaseController
{
    /**
     * Display a listing of contact submissions.
     */
    public function index(Request $request)
    {
        $this->authorizeRole($request, 'admin');

        $query = ContactSubmission::query();

        // Filter by status
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Search
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $submissions = $query->with('readBy:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(15)
            ->withQueryString();

        // Get counts for stats
        $stats = [
            'total' => ContactSubmission::count(),
            'new' => ContactSubmission::new()->count(),
            'read' => ContactSubmission::read()->count(),
            'replied' => ContactSubmission::replied()->count(),
            'archived' => ContactSubmission::archived()->count(),
        ];

        return Inertia::render('admin/ContactSubmissions/Index', [
            'submissions' => $submissions,
            'stats' => $stats,
            'filters' => [
                'status' => $request->status ?? 'all',
                'search' => $request->search ?? '',
            ],
        ]);
    }

    /**
     * Display the specified contact submission.
     */
    public function show(Request $request, ContactSubmission $contactSubmission)
    {
        $this->authorizeRole($request, 'admin');

        // Mark as read if not already read
        if ($contactSubmission->status === 'new') {
            $contactSubmission->update([
                'status' => 'read',
                'read_at' => now(),
                'read_by' => $request->user()->id,
            ]);
        }

        $contactSubmission->load('readBy:id,name,email');

        return Inertia::render('admin/ContactSubmissions/Show', [
            'submission' => $contactSubmission,
        ]);
    }

    /**
     * Update the status of a contact submission.
     */
    public function updateStatus(Request $request, $id)
    {
        $this->authorizeRole($request, 'admin');

        $contactSubmission = ContactSubmission::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:new,read,replied,archived',
            'admin_notes' => 'nullable|string|max:5000',
            'reply_message' => 'required_if:status,replied|nullable|string|max:5000',
        ], [
            'reply_message.required_if' => 'A reply message is required when marking as replied.',
        ]);

        try {
            $updateData = [
                'status' => $validated['status'],
            ];

            if (isset($validated['admin_notes'])) {
                $updateData['admin_notes'] = $validated['admin_notes'];
            }

            // Mark as read if status is read and not already read
            if ($validated['status'] === 'read' && $contactSubmission->status !== 'read') {
                $updateData['read_at'] = now();
                $updateData['read_by'] = $request->user()->id;
            }

            // Handle reply message
            if ($validated['status'] === 'replied' && !empty($validated['reply_message'])) {
                $updateData['reply_message'] = $validated['reply_message'];
                $updateData['replied_at'] = now();
            }

            $contactSubmission->update($updateData);

            // Dispatch job to send email after updating the submission
            if ($validated['status'] === 'replied' && !empty($validated['reply_message'])) {
                // Reload the submission to get the updated data
                $contactSubmission->refresh();
                
                // Dispatch job to send email
                SendContactSubmissionReply::dispatch(
                    $contactSubmission,
                    $validated['reply_message'],
                    $request->user()->name
                );
            }

            return redirect()->back()->with('success', 'Submission status updated successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to update contact submission status', [
                'error' => $e->getMessage(),
                'submission_id' => $contactSubmission->id,
            ]);

            return redirect()->back()->with('error', 'Failed to update submission status.');
        }
    }

    /**
     * Delete a contact submission.
     */
    public function destroy(Request $request, ContactSubmission $contactSubmission)
    {
        $this->authorizeRole($request, 'admin');

        try {
            $contactSubmission->delete();

            return redirect()->route('admin.contact-submissions.index')
                ->with('success', 'Submission deleted successfully.');
        } catch (\Exception $e) {
            Log::error('Failed to delete contact submission', [
                'error' => $e->getMessage(),
                'submission_id' => $contactSubmission->id,
            ]);

            return redirect()->back()->with('error', 'Failed to delete submission.');
        }
    }
}

