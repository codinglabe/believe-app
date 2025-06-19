<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExcelData extends Model
{
    use HasFactory;

    protected $table = 'excel_data';

    protected $fillable = [
        'file_id',
        'row_data',
        'status',
    ];

    protected $casts = [
        'row_data' => 'array',
    ];

    public function uploadedFile()
    {
        return $this->belongsTo(UploadedFile::class, 'file_id');
    }

    public function note()
    {
        return $this->hasOne(ExcelDataNote::class);
    }
}
