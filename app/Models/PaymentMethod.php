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
    ];

    protected $casts = [
        'client_id' => 'encrypted', // Encrypt client_id
        'client_secret' => 'encrypted', // Encrypt client_secret
        'additional_config' => 'array', // Cast JSON to array
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
