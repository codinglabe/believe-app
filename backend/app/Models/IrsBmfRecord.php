<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IrsBmfRecord extends Model
{
    use HasFactory;

    protected $fillable = [
        'ein','name','ico','street','city','state','zip','group','subsection','affiliation','classification','ruling','deductibility','foundation','activity','organization','status','tax_period','asset_cd','income_cd','revenue_amt','ntee_cd','sort_name','raw'
    ];

    protected $casts = [
        'raw' => 'array',
    ];
}
