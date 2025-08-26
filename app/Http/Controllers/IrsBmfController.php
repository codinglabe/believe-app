<?php

namespace App\Http\Controllers;

use App\Models\IrsBmfRecord;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Inertia\Inertia;
use Inertia\Response;

class IrsBmfController extends Controller
{
    public function index(): Response
    {
        $records = IrsBmfRecord::query()
            ->select(['id', 'ein', 'name', 'city', 'state', 'ntee_cd', 'status', 'ruling'])
            ->orderBy('name')
            ->paginate(10); // Changed from 50 to 10

        $stats = [
            'total_records' => IrsBmfRecord::count(),
            'total_states' => IrsBmfRecord::distinct('state')->count(),
            'total_ntee_codes' => IrsBmfRecord::distinct('ntee_cd')->count(),
        ];

        return Inertia::render('IrsBmf/Index', [
            'records' => $records,
            'stats' => $stats,
        ]);
    }

    public function search(Request $request): Response
    {
        $query = $request->get('q');
        $state = $request->get('state');
        $ntee = $request->get('ntee');
        $status = $request->get('status'); // Added status filter

        $records = IrsBmfRecord::query()
            ->select(['id', 'ein', 'name', 'city', 'state', 'ntee_cd', 'status', 'ruling'])
            ->when($query, function ($q) use ($query) {
                $q->where(function ($subQ) use ($query) {
                    $subQ->where('name', 'like', "%{$query}%")
                          ->orWhere('ein', 'like', "%{$query}%")
                          ->orWhere('city', 'like', "%{$query}%");
                });
            })
            ->when($state && $state !== 'all', function ($q) use ($state) {
                $q->where('state', $state);
            })
            ->when($ntee && $ntee !== 'all', function ($q) use ($ntee) {
                $q->where('ntee_cd', 'like', "{$ntee}%");
            })
            ->when($status && $status !== 'all', function ($q) use ($status) { // Added status filtering
                $q->where('status', $status);
            })
            ->orderBy('name')
            ->paginate(10); // Changed from 50 to 10

        $states = IrsBmfRecord::distinct('state')
            ->whereNotNull('state')
            ->pluck('state')
            ->sort()
            ->values();

        $nteeCodes = IrsBmfRecord::distinct('ntee_cd')
            ->whereNotNull('ntee_cd')
            ->pluck('ntee_cd')
            ->sort()
            ->values();

        // Added status codes for filter dropdown
        $statusCodes = IrsBmfRecord::distinct('status')
            ->whereNotNull('status')
            ->pluck('status')
            ->sort()
            ->values();

        return Inertia::render('IrsBmf/Search', [
            'records' => $records,
            'states' => $states,
            'nteeCodes' => $nteeCodes,
            'statusCodes' => $statusCodes, // Pass status codes to frontend
            'filters' => [
                'q' => $query ?? '',
                'state' => $state ?? 'all',
                'ntee' => $ntee ?? 'all',
                'status' => $status ?? 'all', // Pass current status filter
            ],
        ]);
    }

    public function show(IrsBmfRecord $record): Response
    {
        return Inertia::render('IrsBmf/Show', [
            'record' => $record,
        ]);
    }

    public function triggerImport(Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $mode = $request->input('mode', 'full'); // 'full' or 'update-only'
            
            $command = 'irs:bmf:import';
            if ($mode === 'update-only') {
                $command .= ' --update-only';
            }
            
            // Run the command in the background
            Artisan::queue($command);
            
            return response()->json([
                'success' => true,
                'message' => "IRS BMF import started in {$mode} mode. Check the logs for progress.",
                'mode' => $mode
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to start import: ' . $e->getMessage()
            ], 500);
        }
    }
}
