<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StateSalesTax extends Model
{
    protected $fillable = [
        'state',
        'state_code',
        'base_sales_tax_rate',
        'local_rates_apply',
        'last_updated',
        'notes',
        'rate_mode',
        'sales_tax_status',
        'services_vs_goods',
        'charitable_vs_resale',
        'requires_exemption_certificate',
        'certificate_type_allowed',
        'site_to_apply_for_certificate',
    ];

    protected $casts = [
        'base_sales_tax_rate' => 'decimal:2',
        'local_rates_apply' => 'boolean',
        'requires_exemption_certificate' => 'boolean',
    ];
}
