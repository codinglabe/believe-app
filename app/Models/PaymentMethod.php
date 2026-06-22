<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'mode',
        'client_id',
        'client_secret',
        'mode_environment',
        'additional_config',
        'test_publishable_key',
        'test_secret_key',
        'test_customer_id',
        'test_account_id',
        'test_webhook_secret',
        'live_publishable_key',
        'live_secret_key',
        'live_customer_id',
        'live_account_id',
        'live_webhook_secret',
        'test_donation_product_id',
        'live_donation_product_id',
        'sandbox_publishable_key',
        'sandbox_secret_key',
        'sandbox_customer_id',
        'sandbox_account_id',
        'sandbox_webhook_secret',
        'sandbox_donation_product_id',
        // Bridge fields
        'sandbox_api_key',
        'live_api_key',
        'sandbox_webhook_id',
        'sandbox_webhook_public_key',
        'sandbox_webhook_url',
        'sandbox_badge_url',
        'live_webhook_id',
        'live_webhook_public_key',
        'live_badge_url',
    ];

    protected $casts = [
        'client_id' => 'encrypted', // Encrypt client_id
        'client_secret' => 'encrypted', // Encrypt client_secret
        'test_publishable_key' => 'encrypted', // Encrypt test publishable key
        'test_secret_key' => 'encrypted', // Encrypt test secret key
        'test_webhook_secret' => 'encrypted', // Encrypt test webhook secret
        'live_publishable_key' => 'encrypted', // Encrypt live publishable key
        'live_secret_key' => 'encrypted', // Encrypt live secret key
        'live_webhook_secret' => 'encrypted', // Encrypt live webhook secret
        'sandbox_publishable_key' => 'encrypted',
        'sandbox_secret_key' => 'encrypted',
        'sandbox_webhook_secret' => 'encrypted',
        'additional_config' => 'array', // Cast JSON to array
        // Bridge fields
        'sandbox_api_key' => 'encrypted', // Encrypt sandbox API key
        'live_api_key' => 'encrypted', // Encrypt live API key
        'sandbox_webhook_public_key' => 'encrypted', // Encrypt sandbox webhook public key
        'live_webhook_public_key' => 'encrypted', // Encrypt live webhook public key
    ];

    /**
     * Get a specific payment method configuration.
     *
     * @param string $name The name of the payment method (e.g., 'paypal', 'stripe').
     * @return static|null
     */
    public static function getConfig(string $name): ?static
    {
        return static::where('name', $name)->first();
    }

    /**
     * Set a payment method configuration.
     *
     * @param string $name The name of the payment method.
     * @param array $data The data to set, including 'mode', 'client_id', 'client_secret', 'mode_environment', 'additional_config'.
     * @return static
     */
    public static function setConfig(string $name, array $data): static
    {
        return static::updateOrCreate(
            ['name' => $name],
            $data
        );
    }
}
