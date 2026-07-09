<?php

namespace App\Services\PushNotifications;

use App\Enums\PushNotificationModule;
use App\Models\Campaign;
use App\Models\ContentItem;
use App\Models\Course;
use App\Models\Event;
use App\Models\JobPost;
use App\Models\Newsletter;
use App\Models\Organization;
use App\Models\PushNotificationLog;
use App\Models\User;
use App\Models\UserLivestream;

class OrganizationLogoResolver
{
    /**
     * Org-created daily prayer campaigns are sent automatically by the scheduler
     * but must still show the creating organization's logo.
     *
     * @param  array<string, mixed>  $payload
     */
    public function isOrganizationCampaignNotification(?PushNotificationLog $log, array $payload): bool
    {
        if (! empty($payload['campaign_id']) && (int) $payload['campaign_id'] > 0) {
            return true;
        }

        $module = (string) ($log?->module_name ?? $payload['module_name'] ?? '');
        $sourceType = (string) ($payload['source_type'] ?? '');
        $context = (string) ($payload['notification_context'] ?? '');

        return $module === PushNotificationModule::Campaigns->value
            || $sourceType === 'campaign'
            || $context === 'organization_daily_campaign';
    }

    /**
     * System-wide automatic notifications (not tied to an org-created module).
     *
     * @param  array<string, mixed>  $payload
     */
    public function isSystemAutomaticNotification(?PushNotificationLog $log, array $payload): bool
    {
        if ($this->isOrganizationCampaignNotification($log, $payload)) {
            return false;
        }

        $module = (string) ($log?->module_name ?? $payload['module_name'] ?? '');
        $sourceType = (string) ($payload['source_type'] ?? '');
        $type = (string) ($payload['type'] ?? '');

        return $module === PushNotificationModule::DailyEngagement->value
            || $sourceType === 'daily_engagement'
            || $type === 'daily_engagement';
    }

    /**
     * Resolve which organization (if any) should brand this notification.
     *
     * @param  array<string, mixed>  $payload
     */
    public function resolveOrganizationId(?PushNotificationLog $log, array $payload): ?int
    {
        if ($this->isSystemAutomaticNotification($log, $payload)) {
            return null;
        }

        if (! empty($payload['organization_id']) && (int) $payload['organization_id'] > 0) {
            return (int) $payload['organization_id'];
        }

        if ($log?->organization_id) {
            return (int) $log->organization_id;
        }

        if ($log?->created_by) {
            $fromSender = $this->resolveOrganizationIdFromSender((int) $log->created_by);
            if ($fromSender) {
                return $fromSender;
            }
        }

        if (! empty($payload['created_by']) && (int) $payload['created_by'] > 0) {
            $fromSender = $this->resolveOrganizationIdFromSender((int) $payload['created_by']);
            if ($fromSender) {
                return $fromSender;
            }
        }

        if (! empty($payload['sender_id']) && (int) $payload['sender_id'] > 0) {
            $fromSender = $this->resolveOrganizationIdFromSender((int) $payload['sender_id']);
            if ($fromSender) {
                return $fromSender;
            }
        }

        if (! empty($payload['campaign_id'])) {
            $campaignOrgId = Campaign::query()
                ->whereKey((int) $payload['campaign_id'])
                ->value('organization_id');

            if ($campaignOrgId) {
                return (int) $campaignOrgId;
            }
        }

        $fromContentItem = $this->resolveOrganizationIdFromContentItem($payload);
        if ($fromContentItem) {
            return $fromContentItem;
        }

        return $this->resolveOrganizationIdFromModuleRecord($log, $payload);
    }

    /**
     * Resolve organization when creating a push log (before log row exists).
     *
     * @param  array<string, mixed>  $payload
     */
    public function resolveOrganizationIdFromPayload(array $payload, ?int $createdBy = null): ?int
    {
        if ($this->isSystemAutomaticNotification(null, $payload)) {
            return null;
        }

        $stubLog = new PushNotificationLog([
            'module_name' => $payload['module_name'] ?? null,
            'module_record_id' => isset($payload['module_record_id']) ? (int) $payload['module_record_id'] : null,
            'created_by' => $createdBy,
        ]);

        return $this->resolveOrganizationId($stubLog, $payload);
    }

    public function resolveLogoUrl(?PushNotificationLog $log, array $payload): ?string
    {
        if ($this->isSystemAutomaticNotification($log, $payload)) {
            return null;
        }

        if (! empty($payload['organization_logo_url'])) {
            return (string) $payload['organization_logo_url'];
        }

        $organizationId = $this->resolveOrganizationId($log, $payload);
        if (! $organizationId) {
            return null;
        }

        return Organization::query()
            ->with('user:id,image,registered_user_image')
            ->whereKey($organizationId)
            ->first(['id', 'registered_user_image', 'user_id'])
            ?->logoUrl();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveOrganizationIdFromContentItem(array $payload): ?int
    {
        if (! $this->shouldUseContentItemOrganizationLookup($payload)) {
            return null;
        }

        $organizationId = ContentItem::query()
            ->whereKey((int) $payload['content_item_id'])
            ->value('organization_id');

        return $organizationId ? (int) $organizationId : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function shouldUseContentItemOrganizationLookup(array $payload): bool
    {
        if (empty($payload['content_item_id'])) {
            return false;
        }

        $sourceType = (string) ($payload['source_type'] ?? '');
        $type = (string) ($payload['type'] ?? '');

        $skipSourceTypes = ['chat', 'chat_message', 'course', 'event', 'newsletter', 'daily_engagement'];
        $skipTypes = ['chat_message', 'new_course', 'new_meetup', 'new_companion', 'new_earning', 'new_event', 'daily_engagement'];

        if (in_array($sourceType, ['campaign'], true) || ! empty($payload['campaign_id'])) {
            return true;
        }

        if (in_array($sourceType, $skipSourceTypes, true) || in_array($type, $skipTypes, true)) {
            return false;
        }

        return true;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveOrganizationIdFromModuleRecord(?PushNotificationLog $log, array $payload): ?int
    {
        $module = (string) ($log?->module_name ?? $payload['module_name'] ?? '');
        $recordId = $log?->module_record_id
            ?? (isset($payload['module_record_id']) ? (int) $payload['module_record_id'] : null);

        if (! $recordId && ! empty($payload['source_id']) && is_numeric($payload['source_id'])) {
            $recordId = (int) $payload['source_id'];
        }

        if (! $recordId) {
            return null;
        }

        $organizationId = match ($module) {
            PushNotificationModule::Campaigns->value => Campaign::query()->whereKey($recordId)->value('organization_id'),
            PushNotificationModule::Events->value => Event::query()->whereKey($recordId)->value('organization_id'),
            PushNotificationModule::Email->value => Newsletter::query()->whereKey($recordId)->value('organization_id'),
            PushNotificationModule::Courses->value => $this->resolveCourseOrganizationId($recordId),
            PushNotificationModule::Volunteer->value => JobPost::query()->whereKey($recordId)->value('organization_id'),
            PushNotificationModule::UnityMeet->value, PushNotificationModule::UnityLive->value => $this->resolveLivestreamOrganizationId($recordId),
            default => null,
        };

        return $organizationId ? (int) $organizationId : null;
    }

    private function resolveCourseOrganizationId(int $courseId): ?int
    {
        $course = Course::query()->find($courseId, ['id', 'user_id', 'organization_id']);
        if (! $course) {
            return null;
        }

        if ($course->user_id) {
            $user = User::query()->find($course->user_id);
            $org = $user ? Organization::forAuthUser($user) : null;
            if ($org) {
                return $org->id;
            }
        }

        if ($course->organization_id) {
            $org = Organization::query()->where('user_id', $course->organization_id)->first();
            if ($org) {
                return $org->id;
            }
        }

        return null;
    }

    private function resolveLivestreamOrganizationId(int $livestreamId): ?int
    {
        $livestream = UserLivestream::query()->find($livestreamId, ['id', 'user_id']);
        if (! $livestream?->user_id) {
            return null;
        }

        $user = User::query()->find($livestream->user_id);

        return $user ? Organization::forAuthUser($user)?->id : null;
    }

    private function resolveOrganizationIdFromSender(int $userId): ?int
    {
        $user = User::query()->find($userId);

        return $user ? Organization::forAuthUser($user)?->id : null;
    }
}
