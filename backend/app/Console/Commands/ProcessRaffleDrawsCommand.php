<?php

namespace App\Console\Commands;

use App\Jobs\ProcessRaffleDraws;
use Illuminate\Console\Command;

class ProcessRaffleDrawsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'raffles:process-draws';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process raffle draws that are ready to be drawn';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Processing raffle draws...');
        
        ProcessRaffleDraws::dispatch();
        
        $this->info('Raffle draws processing job dispatched successfully!');
    }
}
