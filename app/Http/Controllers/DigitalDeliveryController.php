<?php

namespace App\Http\Controllers;

use App\Models\DigitalProductFile;
use App\Models\MarketplaceProduct;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemDigitalDelivery;
use App\Models\Product;
use App\Services\DigitalDeliveryService;
use App\Support\DigitalProductDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DigitalDeliveryController extends Controller
{
    public function __construct(
        protected DigitalDeliveryService $digitalDeliveryService
    ) {}

    public function uploadCatalogForProduct(Request $request, Product $product): JsonResponse
    {
        $this->authorizeOrgProduct($product);

        if (! DigitalProductDelivery::productIsDigital($product)) {
            return response()->json(['error' => 'This product is not a digital listing.'], 422);
        }

        return $this->uploadCatalogFiles($request, $product->id, null);
    }

    public function uploadCatalogForMarketplaceProduct(Request $request, MarketplaceProduct $marketplaceProduct): JsonResponse
    {
        $merchant = Auth::guard('merchant')->user();
        if (! $merchant || (int) $marketplaceProduct->merchant_id !== (int) $merchant->id) {
            abort(403);
        }

        if (! DigitalProductDelivery::marketplaceProductIsDigital($marketplaceProduct)) {
            return response()->json(['error' => 'This product is not a digital listing.'], 422);
        }

        return $this->uploadCatalogFiles($request, null, $marketplaceProduct->id);
    }

    public function deleteCatalogFile(DigitalProductFile $digitalProductFile): JsonResponse
    {
        if ($digitalProductFile->product_id) {
            $this->authorizeOrgProduct($digitalProductFile->product);
        } elseif ($digitalProductFile->marketplace_product_id) {
            $merchant = Auth::guard('merchant')->user();
            $mp = $digitalProductFile->marketplaceProduct;
            if (! $merchant || ! $mp || (int) $mp->merchant_id !== (int) $merchant->id) {
                abort(403);
            }
        } else {
            abort(403);
        }

        $this->digitalDeliveryService->deleteCatalogFile($digitalProductFile);

        return response()->json(['success' => true]);
    }

    public function uploadOrderItemFiles(Request $request, Order $order, OrderItem $orderItem): JsonResponse
    {
        if ((int) $orderItem->order_id !== (int) $order->id) {
            abort(404);
        }

        $this->authorizeOrderItemFulfillment($order, $orderItem);

        if (! DigitalProductDelivery::orderItemIsDigital($orderItem)) {
            return response()->json(['error' => 'This line item is not a digital product.'], 422);
        }

        if ($order->payment_status !== 'paid') {
            return response()->json(['error' => 'Payment must be completed before uploading files.'], 422);
        }

        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => $this->fileValidationRule(),
        ]);

        $uploaded = [];
        $userId = Auth::id() ?? Auth::guard('merchant')->id();

        foreach ($request->file('files', []) as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }
            $delivery = $this->digitalDeliveryService->storeOrderItemFile($orderItem, $file, $userId);
            $uploaded[] = $this->formatDelivery($delivery);
        }

        return response()->json([
            'success' => true,
            'deliveries' => $uploaded,
        ]);
    }

    public function deleteOrderItemDelivery(Order $order, OrderItem $orderItem, OrderItemDigitalDelivery $delivery): JsonResponse
    {
        if ((int) $orderItem->order_id !== (int) $order->id || (int) $delivery->order_item_id !== (int) $orderItem->id) {
            abort(404);
        }

        $this->authorizeOrderItemFulfillment($order, $orderItem);
        $this->digitalDeliveryService->deleteOrderDelivery($delivery);

        return response()->json(['success' => true]);
    }

    public function download(OrderItemDigitalDelivery $delivery): StreamedResponse
    {
        $delivery->loadMissing('orderItem.order');

        $order = $delivery->orderItem?->order;
        if (! $order || ! $delivery->isReleased()) {
            abort(404);
        }

        if (! $this->canDownload($order, $delivery)) {
            abort(403);
        }

        $disk = Storage::disk(DigitalDeliveryService::DISK);
        if (! $disk->exists($delivery->storage_path)) {
            abort(404);
        }

        return $disk->download(
            $delivery->storage_path,
            $delivery->original_filename,
            ['Content-Type' => $delivery->mime_type ?: 'application/octet-stream']
        );
    }

    private function uploadCatalogFiles(Request $request, ?int $productId, ?int $marketplaceProductId): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'min:1'],
            'files.*' => $this->fileValidationRule(),
        ]);

        $uploaded = [];
        $userId = Auth::id();

        foreach ($request->file('files', []) as $file) {
            if (! $file || ! $file->isValid()) {
                continue;
            }
            $record = $this->digitalDeliveryService->storeCatalogFile(
                $file,
                $productId,
                $marketplaceProductId,
                $userId
            );
            $uploaded[] = [
                'id' => $record->id,
                'original_filename' => $record->original_filename,
                'file_size' => $record->file_size,
                'mime_type' => $record->mime_type,
            ];
        }

        return response()->json([
            'success' => true,
            'files' => $uploaded,
        ]);
    }

    private function fileValidationRule(): array
    {
        $mimes = implode(',', DigitalProductDelivery::allowedUploadMimes());

        return [
            'file',
            'max:'.DigitalProductDelivery::maxUploadKilobytes(),
            'mimes:'.$mimes,
        ];
    }

    private function authorizeOrgProduct(Product $product): void
    {
        $user = Auth::user();
        if (! $user) {
            abort(403);
        }

        if (in_array($user->role, ['admin'], true)) {
            return;
        }

        if (in_array($user->role, ['organization', 'organization_pending'], true)) {
            $org = $user->organization;
            if ($org && (int) $product->organization_id === (int) $org->id) {
                return;
            }
        }

        if ((int) $product->user_id === (int) $user->id) {
            return;
        }

        abort(403);
    }

    private function authorizeOrderItemFulfillment(Order $order, OrderItem $orderItem): void
    {
        $user = Auth::user();
        if ($user) {
            if (in_array($user->role, ['admin'], true)) {
                return;
            }

            if (in_array($user->role, ['organization', 'organization_pending'], true)) {
                $org = $user->organization;
                if ($org && (int) $order->organization_id === (int) $org->id) {
                    return;
                }
            }
        }

        $merchant = Auth::guard('merchant')->user();
        if ($merchant) {
            $mp = $orderItem->marketplaceProduct ?? $orderItem->organizationProduct?->marketplaceProduct;
            if ($mp && (int) $mp->merchant_id === (int) $merchant->id) {
                return;
            }
        }

        abort(403);
    }

    private function canDownload(Order $order, OrderItemDigitalDelivery $delivery): bool
    {
        $user = Auth::user();
        if ($user && (int) $order->user_id === (int) $user->id) {
            return $order->payment_status === 'paid';
        }

        if ($user && in_array($user->role, ['admin'], true)) {
            return true;
        }

        return false;
    }

    private function formatDelivery(OrderItemDigitalDelivery $delivery): array
    {
        return [
            'id' => $delivery->id,
            'original_filename' => $delivery->original_filename,
            'file_size' => $delivery->file_size,
            'mime_type' => $delivery->mime_type,
            'released_at' => $delivery->released_at?->toIso8601String(),
            'download_url' => $delivery->isReleased()
                ? route('digital-deliveries.download', $delivery)
                : null,
        ];
    }
}
