<?php

namespace App\Console\Commands;


use App\Models\ServiceOrder;
use Illuminate\Console\Command;
use Carbon\Carbon;

class AutoCompleteServiceOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'service-orders:auto-complete';


    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically complete delivered orders after 48 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $orders = ServiceOrder::where('status', 'delivered')
            ->where('delivered_at', '<=', Carbon::now()->subHours(48))
            ->get();

        foreach ($orders as $order) {
            $order->autoApproveIfNeeded();
            $this->info("Auto-completed order #{$order->id}");
        }

        $this->info("Processed {$orders->count()} orders.");

        return Command::SUCCESS;
    }
}
