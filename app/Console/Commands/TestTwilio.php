<?php

namespace App\Console\Commands;

use App\Services\NewsletterTwilioSmsService;
use Illuminate\Console\Command;

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

        $this->info('SID: '.($sid ? 'Set' : 'NOT SET'));
        $this->info('Token: '.($token ? 'Set' : 'NOT SET'));
        $this->info('WhatsApp From: '.($whatsappFrom ? $whatsappFrom : 'NOT SET'));
        $verifySsl = config('services.twilio.verify_ssl', true);
        $cafile = config('services.twilio.cafile');
        $this->info('Twilio SSL: verify='.($verifySsl ? 'on' : 'off').', cafile='.($cafile ?: '(php default)'));

        if (! $sid || ! $token) {
            $this->error('Twilio credentials are missing from config!');
            $this->info('Please check your .env file and config/services.php');

            return;
        }

        try {
            $smsService = app(NewsletterTwilioSmsService::class);
            $twilio = $smsService->makeRestClient();

            // Test the connection by fetching account info
            $account = $twilio->api->v2010->accounts($sid)->fetch();

            $this->info('✅ Twilio credentials are valid!');
            $this->info('Account: '.$account->friendlyName);
            $this->info('Status: '.$account->status);
            $accountType = $account->type ?? 'unknown';
            if ($accountType === 'Trial') {
                $this->warn('Account type: Trial (sandbox) — SMS only goes to numbers verified in Twilio Console unless you upgrade to Full.');
            } else {
                $this->info('Account type: '.$accountType.($accountType === 'Full' ? ' (live)' : ''));
            }

            $smsFrom = config('services.twilio.sms_from');
            $smsMsid = config('services.twilio.sms_messaging_service_sid');
            $this->info('SMS from: '.($smsFrom ?: '(not set)').($smsMsid ? ' | Messaging Service: '.$smsMsid : ''));

            // Optional WhatsApp test — set TWILIO_TEST_WHATSAPP_TO=E.164 in .env to enable
            $testWhatsAppTo = env('TWILIO_TEST_WHATSAPP_TO');
            if ($testWhatsAppTo && $whatsappFrom) {
                $this->info("Sending WhatsApp test to: {$testWhatsAppTo}");
                $waRaw = trim($testWhatsAppTo);
                $waE164 = str_starts_with($waRaw, '+') ? $waRaw : '+'.$waRaw;
                $message = $twilio->messages->create(
                    'whatsapp:'.$waE164,
                    [
                        'from' => $whatsappFrom,
                        'body' => 'Test message from your app - Twilio is working!',
                    ]
                );
                $this->info('✅ WhatsApp test sent. Message SID: '.$message->sid);
            } else {
                $this->comment('Skipping WhatsApp send (set TWILIO_TEST_WHATSAPP_TO in .env to test).');
            }

            // Optional SMS test — uses same path as newsletters
            $testSmsTo = env('TWILIO_TEST_SMS_TO');
            if ($testSmsTo && ($smsFrom || $smsMsid)) {
                $this->info("Sending SMS test to: {$testSmsTo}");
                $sms = $smsService;
                if (! $sms->isConfigured()) {
                    $this->error('SMS is not fully configured (TWILIO_SMS_FROM or TWILIO_SMS_SERVICE_SID).');
                } else {
                    $smsE164 = $sms->normalizeToE164($testSmsTo);
                    if (! $smsE164) {
                        $this->error('TWILIO_TEST_SMS_TO could not be normalized to E.164.');
                    } else {
                        $sid = $sms->send($smsE164, 'Believe Wallet SMS test — Twilio is working.');
                        $this->info('✅ SMS test sent. Message SID: '.$sid);
                    }
                }
            } else {
                if (! $smsFrom && ! $smsMsid) {
                    $this->comment('Skipping SMS test — set TWILIO_SMS_FROM (E.164) or TWILIO_SMS_SERVICE_SID.');
                } elseif (! $testSmsTo) {
                    $this->comment('Skipping SMS test — add TWILIO_TEST_SMS_TO=+1xxxxxxxxxx (destination). On a Trial account this must be a verified number in Twilio Console.');
                } else {
                    $this->comment('Skipping SMS test — TWILIO_SMS_FROM or TWILIO_SMS_SERVICE_SID is required.');
                }
            }

        } catch (\Exception $e) {
            $this->error('❌ Twilio test failed: '.$e->getMessage());
            $msg = $e->getMessage();
            if (str_contains($msg, 'SSL certificate') || str_contains($msg, 'local issuer')) {
                $this->line('');
                $this->warn('SSL fix (pick one):');
                $this->line('  1) Download https://curl.se/ca/cacert.pem and set TWILIO_CAFILE=full\\path\\to\\cacert.pem in .env');
                $this->line('  2) Local dev only: TWILIO_VERIFY_SSL=false in .env (never in production)');
                $this->line('  3) Point php.ini curl.cainfo / openssl.cafile to that cacert.pem (fixes all PHP HTTPS)');
            }
        }
    }
}
