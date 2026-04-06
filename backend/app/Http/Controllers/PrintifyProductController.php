<?php
namespace App\Http\Controllers;

use App\Services\PrintifyService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PrintifyProductController extends Controller
{
    protected $printifyService;

    public function __construct(PrintifyService $printifyService)
    {
        $this->printifyService = $printifyService;
    }

    /**
     * Get print providers for a blueprint
     */
    public function getProviders(Request $request): JsonResponse
    {
        $request->validate([
            'blueprint_id' => 'required|integer'
        ]);

        try {
            $providers = $this->printifyService->getProviders($request->blueprint_id);

            return response()->json($providers);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch providers: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get variants for blueprint and provider
     */
    public function getVariants(Request $request): JsonResponse
    {
        $request->validate([
            'blueprint_id' => 'required|integer',
            'print_provider_id' => 'required|integer'
        ]);

        try {
            $variants = $this->printifyService->getVariants(
                $request->blueprint_id,
                $request->print_provider_id
            );

            return response()->json($variants);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch variants: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get shipping information
     */
    public function getShipping(Request $request): JsonResponse
    {
        $request->validate([
            'blueprint_id' => 'required|integer',
            'print_provider_id' => 'required|integer'
        ]);

        try {
            $shipping = $this->printifyService->getShipping(
                $request->blueprint_id,
                $request->print_provider_id
            );

            return response()->json($shipping);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch shipping information: ' . $e->getMessage()
            ], 500);
        }
    }
}
