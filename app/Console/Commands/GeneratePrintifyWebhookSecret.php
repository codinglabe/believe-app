<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class GeneratePrintifyWebhookSecret extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'printify:generate-webhook-secret';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate a secure webhook secret for Printify webhooks';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Generate a secure random secret (40 characters hex = 20 bytes)
        $secret = bin2hex(random_bytes(20));

        $this->info('Printify Webhook Secret Generated:');
        $this->line('');
        $this->line('<fg=cyan>' . $secret . '</>');
        $this->line('');
        $this->info('Add this to your .env file:');
        $this->line('<fg=yellow>PRINTIFY_WEBHOOK_SECRET=' . $secret . '</>');
        $this->line('');
        $this->comment('Note: Use this secret when creating webhooks via Printify API.');
        $this->comment('The secret will be used to verify webhook signatures from Printify.');

        return Command::SUCCESS;
    }
}
