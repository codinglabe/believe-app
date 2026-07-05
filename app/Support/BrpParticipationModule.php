<?php

namespace App\Support;

use App\Enums\PushNotificationModule;

/**
 * Participation modules that earn flat Believe Reward Points (Free vs Prime tier).
 */
final class BrpParticipationModule
{
    public const CATEGORY_MONEY_MOVEMENT = 'money_movement';

    public const CATEGORY_PARTICIPATION = 'participation';

    public const DONATION = 'donation';

    public const BP_PURCHASE = 'bp_purchase';

    public const GIFT_CARD_PURCHASE = 'gift_card_purchase';

    public const MARKETPLACE_PURCHASE = 'marketplace_purchase';

    public const COURSE_PURCHASE = 'course_purchase';

    public const EVENT_REGISTRATION_PAID = 'event_registration_paid';

    public const EVENT_ATTENDANCE_FREE = 'event_attendance_free';

    public const VOLUNTEER = 'volunteer';

    public const ORGANIZATION_REFERRAL = 'organization_referral';

    public const MERCHANT_REFERRAL = 'merchant_referral';

    public const SUPPORTER_REFERRAL = 'supporter_referral';

    public const ORGANIZATION_FOLLOW = 'organization_follow';

    public const PROFILE_COMPLETION = 'profile_completion';

    public const DAILY_LOGIN = 'daily_login';

    public const AI_LEARNING = 'ai_learning';

    public const UNITY_LIVE = 'unity_live';

    public const UNITY_MEET = 'unity_meet';

    /** @deprecated Use {@see COURSE_PURCHASE} */
    public const COURSE = 'course';

    /** @deprecated Use {@see EVENT_REGISTRATION_PAID} or {@see EVENT_ATTENDANCE_FREE} */
    public const EVENT = 'event';

    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return [
            self::DONATION,
            self::BP_PURCHASE,
            self::GIFT_CARD_PURCHASE,
            self::MARKETPLACE_PURCHASE,
            self::COURSE_PURCHASE,
            self::EVENT_REGISTRATION_PAID,
            self::EVENT_ATTENDANCE_FREE,
            self::VOLUNTEER,
            self::ORGANIZATION_REFERRAL,
            self::MERCHANT_REFERRAL,
            self::SUPPORTER_REFERRAL,
            self::ORGANIZATION_FOLLOW,
            self::PROFILE_COMPLETION,
            self::DAILY_LOGIN,
            self::AI_LEARNING,
            self::UNITY_LIVE,
            self::UNITY_MEET,
        ];
    }

    /**
     * @return array<string, bool>
     */
    public static function defaultMoneyMoves(): array
    {
        return [
            self::DONATION => true,
            self::BP_PURCHASE => true,
            self::GIFT_CARD_PURCHASE => true,
            self::MARKETPLACE_PURCHASE => true,
            self::COURSE_PURCHASE => true,
            self::EVENT_REGISTRATION_PAID => true,
            self::EVENT_ATTENDANCE_FREE => false,
            self::VOLUNTEER => false,
            self::ORGANIZATION_REFERRAL => false,
            self::MERCHANT_REFERRAL => false,
            self::SUPPORTER_REFERRAL => false,
            self::ORGANIZATION_FOLLOW => false,
            self::PROFILE_COMPLETION => false,
            self::DAILY_LOGIN => false,
            self::AI_LEARNING => false,
            self::UNITY_LIVE => false,
            self::UNITY_MEET => false,
        ];
    }

    public static function defaultMoneyMovesFor(string $module): bool
    {
        return self::defaultMoneyMoves()[$module] ?? false;
    }

    public static function categoryFor(string $module, ?bool $moneyMoves = null): string
    {
        $isMoney = $moneyMoves ?? self::defaultMoneyMovesFor($module);

        return $isMoney
            ? self::CATEGORY_MONEY_MOVEMENT
            : self::CATEGORY_PARTICIPATION;
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::DONATION => 'Donation',
            self::BP_PURCHASE => 'BP Purchase (10 BP minimum)',
            self::GIFT_CARD_PURCHASE => 'Gift Card Purchase',
            self::MARKETPLACE_PURCHASE => 'Marketplace Purchase',
            self::COURSE_PURCHASE => 'Course Purchase',
            self::EVENT_REGISTRATION_PAID => 'Event Registration (Paid)',
            self::EVENT_ATTENDANCE_FREE => 'Event Attendance (Free)',
            self::VOLUNTEER => 'Volunteer Activity',
            self::ORGANIZATION_REFERRAL => 'Organization Referral',
            self::MERCHANT_REFERRAL => 'Merchant Referral',
            self::SUPPORTER_REFERRAL => 'Supporter Referral',
            self::ORGANIZATION_FOLLOW => 'Organization Follow',
            self::PROFILE_COMPLETION => 'Profile Completion',
            self::DAILY_LOGIN => 'Daily Login',
            self::AI_LEARNING => 'AI Learning / Quiz',
            self::UNITY_LIVE => 'Unity Live',
            self::UNITY_MEET => 'Unity Meet',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function rules(): array
    {
        return [
            self::DONATION => 'Per qualifying donation',
            self::BP_PURCHASE => 'Per qualifying BP purchase (≥ min purchase amount)',
            self::GIFT_CARD_PURCHASE => 'Per gift card purchase',
            self::MARKETPLACE_PURCHASE => 'Per completed order',
            self::COURSE_PURCHASE => 'Per paid course purchase',
            self::EVENT_REGISTRATION_PAID => 'Per paid event registration',
            self::EVENT_ATTENDANCE_FREE => 'Per verified attendance',
            self::VOLUNTEER => 'Per completed volunteer activity',
            self::ORGANIZATION_REFERRAL => 'Per approved referral',
            self::MERCHANT_REFERRAL => 'Per approved referral',
            self::SUPPORTER_REFERRAL => 'Per approved referral',
            self::ORGANIZATION_FOLLOW => 'Per follow',
            self::PROFILE_COMPLETION => 'One-time award',
            self::DAILY_LOGIN => 'Per qualifying login (if enabled)',
            self::AI_LEARNING => 'Per completed activity',
            self::UNITY_LIVE => 'Per verified participation',
            self::UNITY_MEET => 'Per verified participation',
        ];
    }

    public static function ledgerSource(string $module): string
    {
        return match ($module) {
            self::DONATION => 'donation',
            self::GIFT_CARD_PURCHASE => 'gift_card_purchase',
            self::BP_PURCHASE => 'believe_points_purchase',
            self::MARKETPLACE_PURCHASE => 'marketplace_purchase',
            self::COURSE_PURCHASE, self::COURSE => 'course_enrollment',
            self::EVENT_REGISTRATION_PAID => 'event_registration',
            self::EVENT_ATTENDANCE_FREE, self::EVENT => 'event_attendance',
            self::VOLUNTEER => 'volunteer_activity',
            self::ORGANIZATION_REFERRAL => 'organization_referral',
            self::MERCHANT_REFERRAL => 'merchant_referral',
            self::SUPPORTER_REFERRAL => 'supporter_referral',
            self::ORGANIZATION_FOLLOW => 'organization_follow',
            self::PROFILE_COMPLETION => 'profile_completion',
            self::DAILY_LOGIN => 'daily_login',
            self::AI_LEARNING => 'ai_learning',
            self::UNITY_LIVE => 'unity_live',
            self::UNITY_MEET => 'unity_meet',
            default => $module,
        };
    }

    public static function label(string $module): string
    {
        return self::labels()[$module] ?? $module;
    }

    public static function confirmationTitle(string $module): string
    {
        return match ($module) {
            self::DONATION => 'Thank you for your donation!',
            self::VOLUNTEER => 'Thank you for volunteering!',
            self::EVENT_ATTENDANCE_FREE, self::EVENT => 'Thank you for attending our event!',
            self::EVENT_REGISTRATION_PAID => 'Thank you for registering for our event!',
            self::COURSE_PURCHASE, self::COURSE => 'Thank you for your course purchase!',
            self::MARKETPLACE_PURCHASE => 'Thank you for your purchase!',
            self::MERCHANT_REFERRAL => 'Thank you for your referral!',
            self::GIFT_CARD_PURCHASE => 'Thank you for your gift card purchase!',
            self::BP_PURCHASE => 'Thank you for your Believe Points purchase!',
            self::ORGANIZATION_REFERRAL => 'Thank you for your referral!',
            self::SUPPORTER_REFERRAL => 'Thank you for your referral!',
            self::ORGANIZATION_FOLLOW => 'Thank you for following!',
            self::PROFILE_COMPLETION => 'Thank you for completing your profile!',
            self::DAILY_LOGIN => 'Welcome back!',
            self::AI_LEARNING => 'Great job on your learning activity!',
            self::UNITY_LIVE => 'Thank you for joining Unity Live!',
            self::UNITY_MEET => 'Thank you for joining Unity Meet!',
            default => 'Thank you for participating!',
        };
    }

    public static function confirmationMessage(string $module): string
    {
        return match ($module) {
            self::DONATION => 'Thank you for your donation!',
            self::VOLUNTEER => 'Thank you for volunteering!',
            self::EVENT_ATTENDANCE_FREE, self::EVENT => 'Thank you for attending our event!',
            self::EVENT_REGISTRATION_PAID => 'Thank you for registering for our event!',
            self::COURSE_PURCHASE, self::COURSE => 'Thank you for your course purchase!',
            self::MARKETPLACE_PURCHASE => 'Thank you for supporting a participating merchant!',
            self::MERCHANT_REFERRAL => 'Thank you for referring a participating merchant!',
            self::GIFT_CARD_PURCHASE => 'Thank you for your gift card purchase!',
            self::BP_PURCHASE => 'Thank you for your Believe Points purchase!',
            self::ORGANIZATION_REFERRAL => 'Thank you for referring an organization!',
            self::SUPPORTER_REFERRAL => 'Thank you for referring a supporter!',
            self::ORGANIZATION_FOLLOW => 'Thank you for following an organization!',
            self::PROFILE_COMPLETION => 'Thank you for completing your profile!',
            self::DAILY_LOGIN => 'Thank you for logging in today!',
            self::AI_LEARNING => 'Thank you for completing a learning activity!',
            self::UNITY_LIVE => 'Thank you for participating in Unity Live!',
            self::UNITY_MEET => 'Thank you for participating in Unity Meet!',
            default => 'Thank you for participating!',
        };
    }

    public static function pushNotificationModule(string $module): PushNotificationModule
    {
        return match ($module) {
            self::DONATION => PushNotificationModule::Donations,
            self::VOLUNTEER => PushNotificationModule::Volunteer,
            self::EVENT_ATTENDANCE_FREE, self::EVENT_REGISTRATION_PAID, self::EVENT => PushNotificationModule::Events,
            self::COURSE_PURCHASE, self::COURSE => PushNotificationModule::Courses,
            self::MARKETPLACE_PURCHASE, self::MERCHANT_REFERRAL => PushNotificationModule::Marketplace,
            self::GIFT_CARD_PURCHASE, self::BP_PURCHASE, self::DAILY_LOGIN => PushNotificationModule::WalletRewards,
            self::ORGANIZATION_REFERRAL, self::SUPPORTER_REFERRAL, self::ORGANIZATION_FOLLOW, self::PROFILE_COMPLETION => PushNotificationModule::Membership,
            self::AI_LEARNING => PushNotificationModule::Courses,
            self::UNITY_LIVE, self::UNITY_MEET => PushNotificationModule::Events,
            default => PushNotificationModule::WalletRewards,
        };
    }

    /**
     * @param  array<string, mixed>  $metadata
     */
    public static function resolveDeepLink(string $module, array $metadata = []): string
    {
        return match ($module) {
            self::DONATION => isset($metadata['donation_id'])
                ? route('donations.success', ['donation_id' => $metadata['donation_id']])
                : route('donations.success'),
            self::VOLUNTEER => route('volunteers.timesheet.index'),
            self::EVENT_ATTENDANCE_FREE, self::EVENT_REGISTRATION_PAID, self::EVENT, self::COURSE_PURCHASE, self::COURSE => route('courses.enrollment.success'),
            self::MARKETPLACE_PURCHASE => route('marketplace.index'),
            self::GIFT_CARD_PURCHASE, self::BP_PURCHASE => route('believe-points.index'),
            self::ORGANIZATION_FOLLOW => route('user.profile.favorites'),
            self::AI_LEARNING => route('challenge-level-up.index'),
            self::UNITY_LIVE => route('unity-live.index'),
            self::UNITY_MEET => route('livestreams.supporter.index'),
            self::PROFILE_COMPLETION, self::DAILY_LOGIN => route('user.profile.reward-points-ledger'),
            default => route('user.profile.reward-points-ledger'),
        };
    }

    /**
     * Map legacy module slugs from older admin settings / awards.
     *
     * @return list<string>
     */
    public static function migrateFromLegacyModule(string $legacyModule): array
    {
        return match ($legacyModule) {
            self::COURSE => [self::COURSE_PURCHASE],
            self::EVENT => [self::EVENT_REGISTRATION_PAID, self::EVENT_ATTENDANCE_FREE],
            default => [$legacyModule],
        };
    }
}
