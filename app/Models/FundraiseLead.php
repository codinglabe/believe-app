<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FundraiseLead extends Model
{
    protected $fillable = [
        'name',
        'company',
        'email',
        'project_summary',
        'wefunder_project_url',
    ];

    public function investmentClicks()
    {
        return $this->hasMany(InvestmentClick::class);
    }

    public function hasWefunderLink(): bool
    {
        return !empty($this->wefunder_project_url);
    }
}
