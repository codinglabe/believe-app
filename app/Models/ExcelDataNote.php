<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExcelDataNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'excel_data_id',
        'note',
    ];

    public function excelData()
    {
        return $this->belongsTo(ExcelData::class);
    }
}
