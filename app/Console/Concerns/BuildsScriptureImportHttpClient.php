<?php

namespace App\Console\Concerns;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * TLS: `production` always verifies certificates (SCRIPTURE_IMPORT_VERIFY_SSL is ignored on server).
 * Non-production: optional SCRIPTURE_IMPORT_CAFILE or SCRIPTURE_IMPORT_VERIFY_SSL=false for local Windows dev.
 */
trait BuildsScriptureImportHttpClient
{
    protected function scriptureImportHttp(
        int $timeoutSeconds = 90,
        int $connectTimeoutSeconds = 20,
    ): PendingRequest {
        if (app()->environment('production')) {
            $verify = true;
        } else {
            $verifySsl = filter_var(
                config('services.scripture_import.verify_ssl', true),
                FILTER_VALIDATE_BOOL,
            );
            $cafile = config('services.scripture_import.cafile');
            $verify = $verifySsl ? ($cafile ? $cafile : true) : false;
        }

        return Http::acceptJson()
            ->withOptions(['verify' => $verify])
            ->timeout($timeoutSeconds)
            ->connectTimeout($connectTimeoutSeconds)
            ->retry(3, 1500, throw: false)
            ->withHeaders(['User-Agent' => 'Believe-Wallet-Scripture-Import/1.0']);
    }
}
