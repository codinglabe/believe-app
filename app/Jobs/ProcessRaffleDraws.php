<?php

namespace App\Jobs;

use App\Models\Raffle;
use App\Models\RaffleTicket;
use App\Models\RaffleWinner;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProcessRaffleDraws implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public function __construct()
    {
        //
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        // Find raffles that are ready for drawing
        $rafflesToDraw = Raffle::where('status', 'active')
            ->where('draw_date', '<=', now())
            ->get();

        foreach ($rafflesToDraw as $raffle) {
            $this->processRaffleDraw($raffle);
        }
    }

    /**
     * Process the draw for a specific raffle
     */
    private function processRaffleDraw(Raffle $raffle): void
    {
        try {
            $tickets = $raffle->tickets()->where('status', 'active')->get();

            // Check if we have enough tickets for drawing
            if ($tickets->count() < $raffle->winners_count) {
                Log::info("Raffle {$raffle->id} has insufficient tickets for drawing. Tickets: {$tickets->count()}, Required: {$raffle->winners_count}");
                return;
            }

            DB::transaction(function () use ($raffle, $tickets) {
                // Select random winners
                $winners = $tickets->random($raffle->winners_count);

                // Create winner records
                foreach ($winners as $index => $ticket) {
                    RaffleWinner::create([
                        'raffle_id' => $raffle->id,
                        'raffle_ticket_id' => $ticket->id,
                        'user_id' => $ticket->user_id,
                        'position' => $index + 1,
                        'prize_name' => $raffle->prizes[$index]['name'] ?? "Prize " . ($index + 1),
                        'prize_description' => $raffle->prizes[$index]['description'] ?? null,
                        'announced_at' => now(),
                    ]);

                    // Mark ticket as winner
                    $ticket->update(['status' => 'winner']);
                }

                // Mark raffle as completed
                $raffle->update(['status' => 'completed']);

                Log::info("Raffle {$raffle->id} draw completed successfully. Winners: {$winners->count()}");
            });

        } catch (\Exception $e) {
            Log::error("Failed to process raffle draw for raffle {$raffle->id}: " . $e->getMessage());
        }
    }
}
