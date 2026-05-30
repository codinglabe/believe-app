<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItemDigitalDelivery extends Model
{
    protected $fillable = [
        'order_item_id',
        'digital_product_file_id',
        'original_filename',
        'storage_path',
        'mime_type',
        'file_size',
        'uploaded_by_user_id',
        'released_at',
    ];

    protected function casts(): array
    {
        return [
            'file_size' => 'integer',
            'released_at' => 'datetime',
        ];
    }

    public function orderItem(): BelongsTo
    {
        return $this->belongsTo(OrderItem::class);
    }

    public function catalogFile(): BelongsTo
    {
        return $this->belongsTo(DigitalProductFile::class, 'digital_product_file_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    public function isReleased(): bool
    {
        return $this->released_at !== null;
    }
}
