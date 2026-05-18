<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class SetupPermissions extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'permissions:setup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Setup comprehensive permissions system';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Setting up comprehensive permissions system...');

        // Run the comprehensive permissions seeder
        $this->info('Creating permissions and roles...');
        Artisan::call('db:seed', ['--class' => 'ComprehensivePermissionsSeeder']);

        // Clear permission cache
        $this->info('Clearing permission cache...');
        Artisan::call('permission:cache-reset');

        $this->info('Permissions system setup completed successfully!');
        
        $this->newLine();
        $this->info('Available roles:');
        $this->line('  - admin: Full system access');
        $this->line('  - organization: Organization management access');
        $this->line('  - user: Basic user access');
        
        $this->newLine();
        $this->info('Key permissions created:');
        $this->line('  - event.*: Event management');
        $this->line('  - user.*: User management');
        $this->line('  - organization.*: Organization management');
        $this->line('  - course.*: Course management');
        $this->line('  - donation.*: Donation management');
        $this->line('  - And many more...');
    }
}

