<?php

namespace App\Console\Commands;

use App\Models\ScheduledDrop;
use App\Models\User;
use App\Models\SendJob;
use App\Notifications\DailyPrayerNotification;
use App\Events\CampaignNotificationSent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class DispatchDueDrops extends Command
{
    protected $signature = 'drops:dispatch-due';
    protected $description = 'Expand due ScheduledDrops into SendJobs and dispatch notifications';

    public function handle()
    {
        $now = now();
        $this->info("Current UTC time: {$now->toDateTimeString()}");

        $dueDrops = ScheduledDrop::with(['campaign.selectedUsers', 'contentItem'])
            ->pending()
            ->due()
            ->limit(50)
            ->get();

        $this->info("Found {$dueDrops->count()} due drops to process");

        foreach ($dueDrops as $drop) {
            try {
                DB::transaction(function () use ($drop) {
                    $campaign = $drop->campaign;
                    $channels = $campaign->channels ?? ['push'];

                    $selectedUsers = $campaign->selectedUsers()
                        ->where('login_status', true)
                        ->get();

                    if ($selectedUsers->isEmpty()) {
                        $this->warn("No selected users for campaign {$campaign->id}");
                        $drop->update(['status' => 'expanded']);
                        return;
                    }

                    $sentCount = 0;

                    foreach ($selectedUsers as $user) {
                        foreach ($channels as $channel) {
                            // Check channel eligibility
                            if ($channel === 'whatsapp' && !$user->shouldReceiveWhatsApp()) {
                                $this->warn("User {$user->id} not eligible for WhatsApp: opt_in={$user->whatsapp_opt_in}, phone=" . ($user->contact_number ? 'set' : 'empty'));
                                continue;
                            }
                            if ($channel === 'push' && !$user->shouldReceivePush())
                                continue;
                            if ($channel === 'web' && !$user->login_status)
                                continue;

                            // Create idempotency key
                            $idempotencyKey = hash('sha256', implode('|', [
                                $drop->id,
                                $user->id,
                                $channel,
                                $drop->publish_at_utc->toISOString()
                            ]));

                            // Create send job
                            $sendJob = SendJob::firstOrCreate(
                                ['idempotency_key' => $idempotencyKey],
                                [
                                    'scheduled_drop_id' => $drop->id,
                                    'user_id' => $user->id,
                                    'channel' => $channel,
                                    'status' => 'queued',
                                ]
                            );

                            // Dispatch notification if newly created
                            if ($sendJob->wasRecentlyCreated) {
                                try {
                                    if ($channel === 'whatsapp') {
                                        $this->info("Sending WhatsApp to user {$user->id} with phone: {$user->contact_number}");

                                        Log::info('Dispatching WhatsApp notification', [
                                            'user_id' => $user->id,
                                            'phone' => $user->contact_number,
                                            'content_item_id' => $drop->contentItem->id,
                                            'drop_id' => $drop->id
                                        ]);
                                    }

                                   $user->notify(new DailyPrayerNotification($drop->contentItem, $channel));


                                    // Broadcast only for push/web channels (not for WhatsApp)
                                    // if (in_array($channel, ['push', 'web'])) {
                                    //     broadcast(new CampaignNotificationSent(
                                    //         $drop->contentItem,
                                    //         $user->id,
                                    //         $channel,
                                    //     ))->toOthers();
                                    // }

                                    $sendJob->update(['status' => 'sent']);
                                    $sentCount++;

                                    $this->info("✅ Sent {$channel} notification to user {$user->id}");

                                } catch (\Exception $e) {
                                    $sendJob->update([
                                        'status' => 'failed',
                                        'error' => $e->getMessage()
                                    ]);

                                    Log::error("Failed to send {$channel} notification to user {$user->id}", [
                                        'error' => $e->getMessage(),
                                        'user_id' => $user->id,
                                        'channel' => $channel,
                                        'drop_id' => $drop->id
                                    ]);

                                    $this->error("❌ Failed to send {$channel} to user {$user->id}: {$e->getMessage()}");
                                }
                            }
                        }
                    }

                    // Mark drop as expanded
                    $drop->update(['status' => 'expanded']);
                    $this->info("Expanded drop {$drop->id} to {$sentCount} sends");
                });
            } catch (\Exception $e) {
                $this->error("Failed to process drop {$drop->id}: {$e->getMessage()}");
                Log::error("Failed to process drop {$drop->id}", [
                    'error' => $e->getMessage(),
                    'drop_id' => $drop->id
                ]);
            }
        }

        return Command::SUCCESS;
    }
}
