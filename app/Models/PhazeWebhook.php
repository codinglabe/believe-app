<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PhazeWebhook extends Model
{
    protected $fillable = [
        'phaze_webhook_id',
        'url',
        'api_key',
        'authorization_header_name',
        'account_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'phaze_webhook_id' => 'integer',
        'account_id' => 'integer',
    ];

    /**
     * Check if the provided API key matches this webhook's API key
     */
    public function verifyApiKey(string $apiKey): bool
    {
        return hash_equals($this->api_key, $apiKey);
    }
}
