<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LivestreamRecordingDecline extends Model
{
    protected $table = 'livestream_recording_declines';

    protected $fillable = [
        'livestream_kind',
        'livestream_id',
        'guest_label',
    ];
}
