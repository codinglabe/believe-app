<?php

namespace Tests\Unit\Services;

use App\Services\ParticipationBrpRewardNotifier;
use App\Support\BrpParticipationModule;
use Tests\TestCase;

class ParticipationNotificationTest extends TestCase
{
    public function test_confirmation_messages_do_not_mention_brp(): void
    {
        foreach (BrpParticipationModule::all() as $module) {
            $message = BrpParticipationModule::confirmationMessage($module);
            $this->assertStringNotContainsStringIgnoringCase('BRP', $message);
            $this->assertStringNotContainsStringIgnoringCase('reward point', $message);
        }
    }

    public function test_brp_reward_message_includes_awarded_points_and_balance(): void
    {
        $body = $this->buildBrpRewardBody(2, 5);

        $this->assertSame(
            '🎉 Thank you for participating! You earned 2 BRPs. Your BRP Balance is 5.',
            $body,
        );
    }

    public function test_brp_reward_message_formats_fractional_points(): void
    {
        $body = $this->buildBrpRewardBody(1.5, 10.25);

        $this->assertSame(
            '🎉 Thank you for participating! You earned 1.5 BRPs. Your BRP Balance is 10.25.',
            $body,
        );
    }

    public function test_donation_confirmation_message_example(): void
    {
        $this->assertSame(
            'Thank you for your donation!',
            BrpParticipationModule::confirmationMessage(BrpParticipationModule::DONATION),
        );
    }

    public function test_marketplace_confirmation_message_example(): void
    {
        $this->assertSame(
            'Thank you for supporting a participating merchant!',
            BrpParticipationModule::confirmationMessage(BrpParticipationModule::MARKETPLACE_PURCHASE),
        );
    }

    public function test_daily_login_deep_link_uses_registered_profile_route(): void
    {
        $url = BrpParticipationModule::resolveDeepLink(BrpParticipationModule::DAILY_LOGIN);

        $this->assertSame(route('user.profile.reward-points-ledger'), $url);
    }

    private function buildBrpRewardBody(float $awarded, float $balance): string
    {
        $pointsLabel = ParticipationBrpRewardNotifier::formatPoints($awarded);
        $balanceLabel = ParticipationBrpRewardNotifier::formatPoints($balance);

        return "🎉 Thank you for participating! You earned {$pointsLabel} BRPs. Your BRP Balance is {$balanceLabel}.";
    }
}
