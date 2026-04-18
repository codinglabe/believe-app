<?php

namespace App\Console\Commands;

use App\Services\PrintifyService;
use Illuminate\Console\Command;

class PrintifyShopIdCommand extends Command
{
    protected $signature = 'printify:shop-id {--json : Print raw shops JSON from the API}';

    protected $description = 'Show PRINTIFY_SHOP_ID from config and list shops from the Printify API for this token';

    public function handle(PrintifyService $printify): int
    {
        $apiKey = config('printify.api_key');
        if (empty($apiKey)) {
            $this->error('PRINTIFY_API_KEY is not set in your environment.');

            return self::FAILURE;
        }

        $configured = config('printify.shop_id');
        $this->info('Configured PRINTIFY_SHOP_ID (from .env / config):');
        if ($configured === null || $configured === '') {
            $this->line('  <fg=yellow>(not set)</>');
        } else {
            $this->line('  <fg=green>'.$configured.'</>');
        }
        $this->newLine();

        $shops = $printify->listShops();

        if ($this->option('json')) {
            $this->line(json_encode($shops, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

            return self::SUCCESS;
        }

        if ($shops === []) {
            $this->warn('No shops returned from the API (check the key, or see storage/logs if logging is enabled).');

            return self::FAILURE;
        }

        $this->info('Shops for this API token (use id in PRINTIFY_SHOP_ID):');
        $rows = [];
        foreach ($shops as $shop) {
            if (! is_array($shop)) {
                continue;
            }
            $id = $shop['id'] ?? $shop['shop_id'] ?? null;
            $title = $shop['title'] ?? $shop['name'] ?? '';
            if ($id === null) {
                continue;
            }
            $match = (string) $configured !== '' && (string) $id === (string) $configured ? 'yes' : '';
            $rows[] = [(string) $id, (string) $title, $match];
        }

        if ($rows === []) {
            $this->warn('Unexpected API response shape; use --json to inspect.');

            return self::FAILURE;
        }

        $this->table(['Shop id', 'Title', 'Matches config'], $rows);
        $this->newLine();
        $this->comment('Add or update in .env: PRINTIFY_SHOP_ID=<shop id from the table above>');

        return self::SUCCESS;
    }
}
