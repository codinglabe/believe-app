<?php

use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Legacy chat messages were stored as sender-local wall clock (DetectTimezone middleware).
     * Reinterpret each row using the sender's timezone and persist as UTC.
     */
    public function up(): void
    {
        foreach (DB::table('chat_messages')
            ->join('users', 'users.id', '=', 'chat_messages.user_id')
            ->select([
                'chat_messages.id',
                'chat_messages.created_at',
                'chat_messages.updated_at',
                'users.timezone as user_timezone',
            ])
            ->orderBy('chat_messages.id')
            ->cursor() as $row) {
            $timezone = $this->resolveTimezone($row->user_timezone);

            DB::table('chat_messages')->where('id', $row->id)->update([
                'created_at' => $this->toUtcString($row->created_at, $timezone),
                'updated_at' => $this->toUtcString($row->updated_at, $timezone),
            ]);
        }
    }

    public function down(): void
    {
        // Not reversible without storing original timezone offsets per row.
    }

    private function resolveTimezone(?string $timezone): string
    {
        if ($timezone && in_array($timezone, timezone_identifiers_list(), true)) {
            return $timezone;
        }

        return 'UTC';
    }

    private function toUtcString(?string $value, string $timezone): ?string
    {
        if ($value === null) {
            return null;
        }

        return Carbon::parse($value, $timezone)->utc()->format('Y-m-d H:i:s');
    }
};
