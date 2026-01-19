<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RewardPointLedger extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'source',
        'type',
        'reference_id',
        'points',
        'description',
        'metadata',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'points' => 'integer',
        'metadata' => 'array',
    ];

    /**
     * Get the user that owns this ledger entry.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Create a credit entry (points added).
     * 
     * @param int $userId
     * @param string $source (e.g., 'nonprofit_assessment')
     * @param int|null $referenceId (e.g., assessment_id)
     * @param int $points
     * @param string|null $description
     * @param array|null $metadata
     * @return self
     */
    public static function createCredit(
        int $userId,
        string $source,
        ?int $referenceId,
        int $points,
        ?string $description = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'user_id' => $userId,
            'source' => $source,
            'type' => 'credit',
            'reference_id' => $referenceId,
            'points' => $points,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    /**
     * Create a debit entry (points deducted).
     * 
     * @param int $userId
     * @param string $source (e.g., 'merchant_reward_redemption')
     * @param int|null $referenceId (e.g., redemption_id)
     * @param int $points
     * @param string|null $description
     * @param array|null $metadata
     * @return self
     */
    public static function createDebit(
        int $userId,
        string $source,
        ?int $referenceId,
        int $points,
        ?string $description = null,
        ?array $metadata = null
    ): self {
        return self::create([
            'user_id' => $userId,
            'source' => $source,
            'type' => 'debit',
            'reference_id' => $referenceId,
            'points' => $points,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }
}
