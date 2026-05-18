<?php

namespace App\Http\Controllers;

use App\Services\PrintifyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'blueprint_id' => 'required|integer',
        ]);

        try {
            $providers = $this->printifyService->getProviders($request->blueprint_id);

            return response()->json($providers);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch providers: '.$e->getMessage(),
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
            'print_provider_id' => 'required|integer',
        ]);

        try {
            $variants = $this->printifyService->getVariants(
                $request->blueprint_id,
                $request->print_provider_id
            );

            return response()->json($variants);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch variants: '.$e->getMessage(),
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
            'print_provider_id' => 'required|integer',
        ]);

        try {
            $shipping = $this->printifyService->getShipping(
                $request->blueprint_id,
                $request->print_provider_id
            );

            return response()->json($shipping);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch shipping information: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Provider comparison for product create (costs, shipping, handling from Printify catalog).
     */
    public function getProviderComparison(Request $request): JsonResponse
    {
        $request->validate([
            'blueprint_id' => 'required|integer',
            'reference_print_provider_id' => 'nullable|integer|min:1',
            'catalog_variant_id' => 'nullable|integer|min:1',
            'catalog_variant_title' => 'nullable|string|max:500',
        ]);

        try {
            $refPid = $request->filled('reference_print_provider_id')
                ? (int) $request->input('reference_print_provider_id')
                : null;
            $catalogVariantId = $request->filled('catalog_variant_id')
                ? (int) $request->input('catalog_variant_id')
                : null;
            $catalogVariantTitle = $request->input('catalog_variant_title');
            $catalogVariantTitle = is_string($catalogVariantTitle) ? $catalogVariantTitle : null;

            $data = $this->printifyService->getProviderComparison(
                (int) $request->blueprint_id,
                $refPid,
                $catalogVariantId,
                $catalogVariantTitle
            );

            return response()->json($data);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to build provider comparison: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Creates a short-lived Printify shop product with the uploaded design, reads variant fulfillment costs,
     * then deletes the product. Used on product create so sellers can see print cost before final submit.
     */
    public function previewVariantCosts(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'blueprint_id' => 'required|integer',
            'print_provider_id' => 'required|integer',
            'variant_ids' => ['required', 'array', 'min:1', 'max:40'],
            'variant_ids.*' => ['integer', 'min:1'],
            'printify_images' => ['required', 'array', 'min:1'],
            'printify_images.*' => ['file', 'mimes:jpeg,jpg,png', 'max:1024'],
        ]);

        try {
            $files = $request->file('printify_images');
            if (! is_array($files)) {
                $files = $files ? [$files] : [];
            }
            $files = array_values(array_filter(
                $files,
                fn ($f) => $f instanceof \Illuminate\Http\UploadedFile
            ));

            $prepared = $this->printifyService->prepareDesignPlaceholdersFromUploads($files);
            $rows = $this->printifyService->previewVariantCostsViaTempProduct(
                (int) $validated['blueprint_id'],
                (int) $validated['print_provider_id'],
                array_map('intval', $validated['variant_ids']),
                $prepared,
            );

            return response()->json(['variant_costs' => $rows]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 422);
        }
    }
}
