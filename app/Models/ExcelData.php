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
        'ein',
        'status',
        'ein',
        'name_virtual',
        'state_virtual',
        'city_virtual',
        'zip_virtual',
        'ntee_code_virtual',
        'sort_name_virtual',
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

    // Get header row for a specific file
    public static function getHeaderForFile($fileId)
    {
        return self::where('file_id', $fileId)
            ->orderBy('id')
            ->first()
            ->row_data ?? [];
    }

    // Get data rows for a specific file (excluding header)
    public static function getDataForFile($fileId)
    {
        return self::where('file_id', $fileId)
            ->orderBy('id')
            ->skip(1) // Skip header row
            ->get();
    }

    // Search by EIN across all files
    public static function findByEIN($ein)
    {
        return self::whereJsonContains('row_data->0', $ein)
            ->orWhereJsonContains('row_data', $ein)
            ->get();
    }

    public function nteeCode()
    {
        return $this->belongsTo(NteeCode::class, 'ntee_code_virtual', 'ntee_codes');
    }
}
