<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Twilio\Rest\Client;

class TestTwilio extends Command
{
    protected $signature = 'test:twilio';
    protected $description = 'Test Twilio configuration';

    public function handle()
    {
        $this->info('Testing Twilio configuration...');

        // Check if environment variables are set
        $sid = config('services.twilio.sid');
        $token = config('services.twilio.token');
        $whatsappFrom = config('services.twilio.whatsapp_from');

        $this->info("SID: " . ($sid ? 'Set' : 'NOT SET'));
        $this->info("Token: " . ($token ? 'Set' : 'NOT SET'));
        $this->info("WhatsApp From: " . ($whatsappFrom ? $whatsappFrom : 'NOT SET'));

        if (!$sid || !$token) {
            $this->error('Twilio credentials are missing from config!');
            $this->info('Please check your .env file and config/services.php');
            return;
        }

        try {
            $twilio = new Client($sid, $token);

            // Test the connection by fetching account info
            $account = $twilio->api->v2010->accounts($sid)->fetch();

            $this->info('✅ Twilio credentials are valid!');
            $this->info("Account: " . $account->friendlyName);
            $this->info("Status: " . $account->status);

            // Test sending a message (optional - comment out if you don't want to send)
            $testNumber = '+8801749931891'; // Your test number
            $this->info("Testing message to: {$testNumber}");

            $message = $twilio->messages->create(
                "whatsapp:{$testNumber}",
                [
                    'from' => $whatsappFrom,
                    'body' => 'Test message from your app - Twilio is working!'
                ]
            );

            $this->info('✅ Test message sent successfully!');
            $this->info("Message SID: " . $message->sid);

        } catch (\Exception $e) {
            $this->error('❌ Twilio test failed: ' . $e->getMessage());
        }
    }
}
