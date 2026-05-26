<?php

namespace App\Services;

use App\Models\DigitalProductFile;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderItemDigitalDelivery;
use App\Support\DigitalProductDelivery;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class DigitalDeliveryService
{
    public const DISK = 'local';

    public function storeCatalogFile(
        UploadedFile $file,
        ?int $productId,
        ?int $marketplaceProductId,
        ?int $uploadedByUserId = null
    ): DigitalProductFile {
        $path = $file->store('digital-catalog', self::DISK);

        return DigitalProductFile::create([
            'product_id' => $productId,
            'marketplace_product_id' => $marketplaceProductId,
            'original_filename' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize() ?: 0,
            'sort_order' => (int) DigitalProductFile::query()
                ->when($productId, fn ($q) => $q->where('product_id', $productId))
                ->when($marketplaceProductId, fn ($q) => $q->where('marketplace_product_id', $marketplaceProductId))
                ->max('sort_order') + 1,
            'uploaded_by_user_id' => $uploadedByUserId,
        ]);
    }

    public function storeOrderItemFile(
        OrderItem $orderItem,
        UploadedFile $file,
        ?int $uploadedByUserId = null,
        bool $releaseImmediately = true
    ): OrderItemDigitalDelivery {
        $path = $file->store('digital-orders/'.$orderItem->order_id, self::DISK);

        $delivery = OrderItemDigitalDelivery::create([
            'order_item_id' => $orderItem->id,
            'original_filename' => $file->getClientOriginalName(),
            'storage_path' => $path,
            'mime_type' => $file->getClientMimeType(),
            'file_size' => $file->getSize() ?: 0,
            'uploaded_by_user_id' => $uploadedByUserId,
            'released_at' => $releaseImmediately ? now() : null,
        ]);

        $this->syncOrderFulfillmentStatus($orderItem->order);

        return $delivery;
    }

    public function provisionCatalogFilesForOrder(Order $order): void
    {
        $order->loadMissing([
            'items.product.digitalFiles',
            'items.marketplaceProduct.digitalFiles',
            'items.organizationProduct.marketplaceProduct.digitalFiles',
        ]);

        foreach ($order->items as $item) {
            if (! DigitalProductDelivery::orderItemIsDigital($item)) {
                continue;
            }

            $catalogFiles = $this->catalogFilesForOrderItem($item);
            foreach ($catalogFiles as $catalogFile) {
                $exists = OrderItemDigitalDelivery::query()
                    ->where('order_item_id', $item->id)
                    ->where('digital_product_file_id', $catalogFile->id)
                    ->exists();

                if ($exists) {
                    continue;
                }

                $copyPath = $this->copyStorageFile($catalogFile->storage_path, 'digital-orders/'.$order->id);

                OrderItemDigitalDelivery::create([
                    'order_item_id' => $item->id,
                    'digital_product_file_id' => $catalogFile->id,
                    'original_filename' => $catalogFile->original_filename,
                    'storage_path' => $copyPath,
                    'mime_type' => $catalogFile->mime_type,
                    'file_size' => $catalogFile->file_size,
                    'uploaded_by_user_id' => $catalogFile->uploaded_by_user_id,
                    'released_at' => now(),
                ]);
            }
        }

        $this->syncOrderFulfillmentStatus($order);
    }

    /**
     * @return \Illuminate\Support\Collection<int, DigitalProductFile>
     */
    public function catalogFilesForOrderItem(OrderItem $item): \Illuminate\Support\Collection
    {
        if ($item->marketplace_product_id && $item->marketplaceProduct) {
            return $item->marketplaceProduct->digitalFiles;
        }

        if ($item->organization_product_id) {
            $mp = $item->organizationProduct?->marketplaceProduct;

            return $mp ? $mp->digitalFiles : collect();
        }

        if ($item->product_id && $item->product) {
            return $item->product->digitalFiles;
        }

        return collect();
    }

    public function syncOrderFulfillmentStatus(Order $order): void
    {
        if (! DigitalProductDelivery::orderIsDigitalOnly($order)) {
            return;
        }

        $order->loadMissing(['items.digitalDeliveries']);

        $allFulfilled = $order->items->every(function (OrderItem $item) {
            if (! DigitalProductDelivery::orderItemIsDigital($item)) {
                return true;
            }

            return $item->digitalDeliveries->contains(fn (OrderItemDigitalDelivery $d) => $d->isReleased());
        });

        if ($allFulfilled && $order->payment_status === 'paid' && ! in_array($order->status, ['cancelled', 'refunded'], true)) {
            $order->update([
                'status' => 'delivered',
                'shipping_status' => 'completed',
            ]);
        }
    }

    public function deleteCatalogFile(DigitalProductFile $file): void
    {
        Storage::disk(self::DISK)->delete($file->storage_path);
        $file->delete();
    }

    public function deleteOrderDelivery(OrderItemDigitalDelivery $delivery): void
    {
        Storage::disk(self::DISK)->delete($delivery->storage_path);
        $order = $delivery->orderItem?->order;
        $delivery->delete();
        if ($order) {
            $this->syncOrderFulfillmentStatus($order);
        }
    }

    private function copyStorageFile(string $sourcePath, string $targetDirectory): string
    {
        $disk = Storage::disk(self::DISK);
        $basename = basename($sourcePath);
        $targetPath = rtrim($targetDirectory, '/').'/'.$basename;
        if ($disk->exists($sourcePath)) {
            $disk->copy($sourcePath, $targetPath);

            return $targetPath;
        }

        return $sourcePath;
    }
}
