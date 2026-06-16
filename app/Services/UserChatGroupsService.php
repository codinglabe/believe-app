<?php

namespace App\Services;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Support\Collection;

class UserChatGroupsService
{
    /**
     * @return array{
     *     rooms: list<array<string, mixed>>,
     *     stats: array{total: int, public: int, private: int, direct: int, group_total: int}
     * }
     */
    public function listForUser(User $user, string $filter = 'groups'): array
    {
        $memberships = ChatRoom::query()
            ->where('is_active', true)
            ->whereHas('members', fn ($query) => $query->where('user_id', $user->id))
            ->with(['creator:id,name,image', 'topics:id,name', 'members:id,name,image'])
            ->withCount('members')
            ->latest('updated_at')
            ->get();

        $stats = [
            'total' => $memberships->count(),
            'public' => $memberships->where('type', 'public')->count(),
            'private' => $memberships->where('type', 'private')->count(),
            'direct' => $memberships->where('type', 'direct')->count(),
            'group_total' => $memberships->whereIn('type', ['public', 'private'])->count(),
        ];

        $filtered = match ($filter) {
            'direct' => $memberships->where('type', 'direct'),
            'all' => $memberships,
            default => $memberships->whereIn('type', ['public', 'private']),
        };

        return [
            'rooms' => $this->formatRooms($filtered, $user),
            'stats' => $stats,
        ];
    }

    /**
     * @param  Collection<int, ChatRoom>  $rooms
     * @return list<array<string, mixed>>
     */
    private function formatRooms(Collection $rooms, User $user): array
    {
        return $rooms->map(function (ChatRoom $room) use ($user) {
            $latestMessage = $room->latestMessage()->with('user:id,name,image')->first();
            $memberPivot = $room->members->firstWhere('id', $user->id)?->pivot;
            $lastSeen = $memberPivot?->last_seen_at;

            $unreadCount = 0;
            if ($lastSeen) {
                $unreadCount = $room->messages()
                    ->where('user_id', '!=', $user->id)
                    ->where('created_at', '>', $lastSeen)
                    ->count();
            } else {
                $unreadCount = $room->messages()->where('user_id', '!=', $user->id)->count();
            }

            $displayName = $room->type === 'direct'
                ? $this->directRoomDisplayName($room, $user)
                : $room->name;

            return [
                'id' => $room->id,
                'name' => $displayName,
                'raw_name' => $room->name,
                'description' => $room->description,
                'type' => $room->type,
                'type_label' => $this->typeLabel($room->type),
                'image' => $room->image ? '/storage/'.$room->image : null,
                'members_count' => $room->members_count,
                'unread_count' => $unreadCount,
                'chat_url' => '/chat?room='.$room->id,
                'topics' => $room->topics->map(fn ($topic) => [
                    'id' => $topic->id,
                    'name' => $topic->name,
                ])->values()->all(),
                'creator' => $room->creator ? [
                    'id' => $room->creator->id,
                    'name' => $room->creator->name,
                    'image' => $room->creator->image ? '/storage/'.$room->creator->image : null,
                ] : null,
                'latest_message' => $latestMessage ? [
                    'content' => $latestMessage->message ?? '',
                    'created_at' => $this->toIso8601($latestMessage->created_at),
                    'user' => $latestMessage->user ? [
                        'id' => $latestMessage->user->id,
                        'name' => $latestMessage->user->name,
                        'image' => $latestMessage->user->image ? '/storage/'.$latestMessage->user->image : null,
                    ] : null,
                ] : null,
                'joined_at' => $this->toIso8601($memberPivot?->joined_at),
                'created_at' => $this->toIso8601($room->created_at),
            ];
        })->values()->all();
    }

    private function toIso8601(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format(\DateTimeInterface::ATOM);
        }

        if (is_string($value) && $value !== '') {
            return $value;
        }

        return null;
    }

    private function directRoomDisplayName(ChatRoom $room, User $user): string
    {
        $other = $room->members->firstWhere('id', '!=', $user->id);

        return $other?->name ?? preg_replace('/^Direct\s+/i', '', (string) $room->name) ?: 'Direct message';
    }

    private function typeLabel(string $type): string
    {
        return match ($type) {
            'public' => 'Public group',
            'private' => 'Private group',
            'direct' => 'Direct message',
            default => ucfirst($type),
        };
    }
}
