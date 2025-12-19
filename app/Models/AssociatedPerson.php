<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssociatedPerson extends Model
{
    protected $table = 'associated_persons';
    
    protected $fillable = [
        'bridge_kyc_kyb_submission_id',
        'first_name',
        'last_name',
        'email',
        'birth_date',
        'ssn',
        'title',
        'ownership_percentage',
        'street_line_1',
        'city',
        'state',
        'postal_code',
        'country',
        'id_type',
        'id_number',
        'bridge_associated_person_id',
        'kyc_link',
        'iframe_kyc_link',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'ownership_percentage' => 'decimal:2',
    ];

    /**
     * Get the submission this associated person belongs to
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(BridgeKycKybSubmission::class, 'bridge_kyc_kyb_submission_id');
    }

    /**
     * Get ID front image from verification documents
     * Note: ID documents are stored at submission level (for control person)
     * Since control person is also an associated person, we get from submission level
     */
    public function getIdFrontImage()
    {
        return $this->submission
            ?->verificationDocuments()
            ->where('document_type', 'id_front')
            ->first();
    }

    /**
     * Get ID back image from verification documents
     * Note: ID documents are stored at submission level (for control person)
     * Since control person is also an associated person, we get from submission level
     */
    public function getIdBackImage()
    {
        return $this->submission
            ?->verificationDocuments()
            ->where('document_type', 'id_back')
            ->first();
    }
}
