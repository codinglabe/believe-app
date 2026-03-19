<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KioskServiceRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KioskServiceRequestsController extends Controller
{
    public function __construct()
    {
        $this->middleware(['auth', 'EnsureEmailIsVerified', 'role:admin']);
    }

    public function index(Request $request): Response
    {
        $query = KioskServiceRequest::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('search')) {
            $term = trim($request->string('search')->toString());
            $query->where(function ($q) use ($term) {
                $q->where('display_name', 'like', '%'.$term.'%')
                    ->orWhere('requester_name', 'like', '%'.$term.'%')
                    ->orWhere('requester_email', 'like', '%'.$term.'%')
                    ->orWhere('category_slug', 'like', '%'.$term.'%')
                    ->orWhere('subcategory', 'like', '%'.$term.'%')
                    ->orWhere('url', 'like', '%'.$term.'%')
                    ->orWhere('ai_reason', 'like', '%'.$term.'%');
            });
        }

        $requests = $query->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn ($row) => [
                'id' => $row->id,
                'requester_name' => $row->requester_name,
                'requester_email' => $row->requester_email,
                'display_name' => $row->display_name,
                'category_slug' => $row->category_slug,
                'subcategory' => $row->subcategory,
                'state' => $row->state,
                'city' => $row->city,
                'url' => $row->url,
                'status' => $row->status,
                'ai_decision' => $row->ai_decision,
                'ai_reason' => $row->ai_reason,
                'ai_suggested_url' => $row->ai_suggested_url,
                'approved_service_id' => $row->approved_service_id,
                'created_at' => optional($row->created_at)->toDateTimeString(),
            ]);

        return Inertia::render('admin/kiosk-requests/index', [
            'requests' => $requests,
            'filters' => [
                'search' => $request->query('search'),
                'status' => $request->query('status'),
            ],
        ]);
    }
}

