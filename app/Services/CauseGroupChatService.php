<?php

namespace App\Services;

use App\Models\ChatRoom;
use App\Models\ChatTopic;
use App\Models\PrimaryActionCategory;
use App\Models\User;
use Illuminate\Support\Str;

class CauseGroupChatService
{
    /**
     * Ensure a public group chat exists for this cause, add the user as a member,
     * and attach the matching chat topic to their profile so the room appears under Groups.
     */
    public function ensureForUserAndPrimaryActionCategory(User $user, int $primaryActionCategoryId): void
    {
        if ($primaryActionCategoryId < 1) {
            return;
        }

        $pac = PrimaryActionCategory::query()
            ->where('is_active', true)
            ->whereKey($primaryActionCategoryId)
            ->first();

        if (! $pac) {
            return;
        }

        $label = (string) $pac->name;
        $uniqueName = 'Cause #'.$pac->id.': '.Str::limit($label, 200);

        $topic = ChatTopic::query()
            ->where('primary_action_category_id', $pac->id)
            ->first();

        if ($topic) {
            // Keep name in sync if admin renamed the cause
            if ($topic->name !== $uniqueName) {
                $other = ChatTopic::query()->where('name', $uniqueName)->where('id', '!=', $topic->id)->exists();
                if (! $other) {
                    $topic->update(['name' => $uniqueName, 'is_active' => true]);
                }
            }
        } else {
            $topic = ChatTopic::create([
                'name' => $uniqueName,
                'description' => 'Group for supporters interested in: '.$label,
                'is_active' => true,
                'primary_action_category_id' => $pac->id,
            ]);
        }

        $room = ChatRoom::query()
            ->where('type', 'public')
            ->where('is_active', true)
            ->whereHas('topics', function ($q) use ($topic) {
                $q->where('chat_topics.id', $topic->id);
            })
            ->first();

        if (! $room) {
            $room = ChatRoom::create([
                'name' => $label,
                'description' => 'Connect with others about '.$label.'.',
                'type' => 'public',
                'created_by' => $user->id,
                'is_active' => true,
            ]);
            $room->topics()->sync([$topic->id]);
        } elseif ($room->name !== $label) {
            $room->update(['name' => $label]);
        }

        if (! $room->members()->where('user_id', $user->id)->exists()) {
            $room->members()->attach($user->id, [
                'role' => 'member',
                'joined_at' => now(),
            ]);
        }

        if (! $user->interestedTopics()->where('chat_topics.id', $topic->id)->exists()) {
            $user->interestedTopics()->attach($topic->id);
        }
    }

    /**
     * @param  int[]  $primaryActionCategoryIds
     */
    public function ensureForUserAndCategoryIds(User $user, array $primaryActionCategoryIds): void
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $primaryActionCategoryIds), fn (int $id) => $id > 0)));
        foreach ($ids as $id) {
            $this->ensureForUserAndPrimaryActionCategory($user, $id);
        }
    }
}
