<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\User;
use Database\Seeders\Support\SeederRunTracker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationSettingsController extends Controller
{
    /**
     * Resolve the admin user and bind them to the web guard.
     * Artisan::call() runs console code paths where auth is often empty; seeders / observers may read auth()->id().
     */
    private function adminForArtisanRequest(Request $request): User
    {
        $user = $request->user();

        abort_if($user === null || $user->role !== 'admin', 403);

        Auth::shouldUse('web');
        Auth::guard('web')->setUser($user);

        return $user;
    }

    /**
     * Re-apply the admin on the web guard after Artisan::call (some stacks reset auth during console runs).
     */
    private function rebindAdminAfterArtisan(User $admin): void
    {
        Auth::shouldUse('web');
        Auth::guard('web')->setUser($admin);
    }

    /**
     * `php artisan db:seed --class=Foo` does not go through {@see \Database\Seeders\DatabaseSeeder::callUnlessSeeded},
     * so {@see SeederRunTracker} is never updated and the settings UI still shows “Not recorded”.
     */
    private function markSeederCompletedForUi(string $class, int $exitCode): void
    {
        if ($exitCode !== 0) {
            return;
        }

        SeederRunTracker::markCompleted($class);
    }

    /**
     * Show the application settings page.
     */
    public function index(Request $request): Response
    {
        // Only allow admin access
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        // Get footer settings
        $footerSettings = AdminSetting::get('footer_settings', null);

        $load = $request->query('load_configuration');

        $props = [
            'cache_stats' => $this->getCacheStats(),
            'storage_stats' => $this->getStorageStats(),
            'storage_link' => $this->getPublicStorageLinkStatus(),
            'migration_status' => $this->getMigrationStatus(),
            'footer_settings' => $footerSettings,
        ];

        // Loaded on demand via Inertia partial visit (`load_configuration` + `only`), one tab at a time.
        // Omit keys when not requested so the other tab’s props stay merged on the client.
        if ($load === 'migrations') {
            $props['migrations_configuration'] = $this->getMigrationsConfiguration($request);
        }

        if ($load === 'seeders') {
            $props['seeders_configuration'] = $this->getSeedersConfiguration($request);
        }

        return Inertia::render('settings/application', $props);
    }

    /**
     * Create the public/storage symlink (php artisan storage:link).
     */
    public function storageLink(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        try {
            if ($this->allPublicStorageLinksConnected()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Public storage is already linked.',
                    'storage_link' => $this->getPublicStorageLinkStatus(),
                ]);
            }

            $removed = $this->removeObstructingPublicStoragePaths();

            Artisan::call('storage:link', ['--force' => true]);
            $output = trim(Artisan::output());

            Log::info('Storage link created by admin', [
                'admin_id' => $request->user()->id,
                'removed_paths' => $removed,
            ]);

            $messageParts = array_filter([
                ...$removed,
                $output !== '' ? $output : null,
            ]);
            $message = count($messageParts) > 0
                ? implode("\n", $messageParts)
                : 'Public storage linked successfully.';

            return response()->json([
                'success' => true,
                'message' => $message,
                'storage_link' => $this->getPublicStorageLinkStatus(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Storage link failed', [
                'admin_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Remove paths that block storage:link: plain folders/files, or wrong symlinks.
     * Only touches paths declared in config('filesystems.links').
     *
     * @return list<string> Human-readable steps for the UI / logs
     */
    private function removeObstructingPublicStoragePaths(): array
    {
        $notes = [];

        foreach ($this->getConfiguredStorageLinks() as $linkPath => $targetPath) {
            if (! file_exists($linkPath)) {
                continue;
            }

            if ($this->isPublicStorageConnected($linkPath, $targetPath)) {
                continue;
            }

            $this->removeBlockingPathAtPublicStorage($linkPath);
            $notes[] = "Removed blocking path at {$linkPath}";
        }

        return $notes;
    }

    /**
     * Configured public → storage/app/public mappings (same as `php artisan storage:link`).
     *
     * @return array<string, string>
     */
    private function getConfiguredStorageLinks(): array
    {
        $links = config('filesystems.links', []);

        return count($links) === 0
            ? [public_path('storage') => storage_path('app/public')]
            : $links;
    }

    /**
     * True when public path resolves to the same directory as storage/app/public.
     * Uses realpath() so Windows junctions / symlinks work even when is_link() is false.
     */
    private function isPublicStorageConnected(string $linkPath, string $targetPath): bool
    {
        if (! file_exists($linkPath) || ! is_dir($targetPath)) {
            return false;
        }

        $resolvedLink = realpath($linkPath);
        $resolvedTarget = realpath($targetPath);

        if ($resolvedLink === false || $resolvedTarget === false) {
            return false;
        }

        return $this->pathsEqual($resolvedLink, $resolvedTarget);
    }

    /**
     * All configured link paths exist and resolve to their targets.
     */
    private function allPublicStorageLinksConnected(): bool
    {
        foreach ($this->getConfiguredStorageLinks() as $linkPath => $targetPath) {
            if (! is_dir($targetPath)) {
                return false;
            }
            if (! file_exists($linkPath)) {
                return false;
            }
            if (! $this->isPublicStorageConnected($linkPath, $targetPath)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Remove symlink, directory, or file blocking storage:link.
     */
    private function removeBlockingPathAtPublicStorage(string $linkPath): void
    {
        if (is_link($linkPath)) {
            if (! @unlink($linkPath)) {
                throw new \RuntimeException("Could not remove existing symlink at [{$linkPath}]. Check permissions.");
            }

            return;
        }

        if (is_dir($linkPath)) {
            File::deleteDirectory($linkPath);

            return;
        }

        if (! @unlink($linkPath)) {
            if (is_dir($linkPath)) {
                File::deleteDirectory($linkPath);

                return;
            }

            throw new \RuntimeException("Could not remove existing path at [{$linkPath}]. Check permissions.");
        }
    }

    /**
     * Run pending database migrations (php artisan migrate --force).
     * Optional JSON body: { "migrations": ["2014_10_12_000000_create_users_table", ...] } — only pending names allowed, run in file order.
     * Omit body or "migrations" key to run all pending migrations.
     */
    public function migrate(Request $request)
    {
        $admin = $this->adminForArtisanRequest($request);

        $requested = $request->input('migrations');

        try {
            if ($requested === null) {
                Artisan::call('migrate', ['--force' => true]);
                $output = trim(Artisan::output());
                $this->rebindAdminAfterArtisan($admin);

                Log::info('Migrations run by admin (all)', ['admin_id' => $admin->id]);

                return response()->json([
                    'success' => true,
                    'message' => $output !== '' ? $output : 'Migrations completed.',
                    'migration_status' => $this->getMigrationStatus(),
                ]);
            }

            if (! is_array($requested)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid request: migrations must be an array of migration base names.',
                ], 422);
            }

            $requested = array_values(array_unique(array_filter($requested, fn ($n) => is_string($n) && $n !== '')));

            if (count($requested) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Select at least one pending migration.',
                ], 422);
            }

            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles([database_path('migrations')]);
            ksort($files);

            if (! $migrator->repositoryExists()) {
                return response()->json([
                    'success' => false,
                    'message' => 'The migrations table is not set up yet. Use Run all pending migrations once, then you can run individual files.',
                ], 422);
            }

            $batches = DB::table('migrations')->pluck('batch', 'migration')->all();

            $pendingNames = [];
            foreach ($files as $name => $_path) {
                if (! array_key_exists($name, $batches)) {
                    $pendingNames[$name] = true;
                }
            }

            $requestSet = array_flip($requested);

            foreach ($requested as $name) {
                if (! isset($files[$name])) {
                    return response()->json([
                        'success' => false,
                        'message' => "Unknown migration: {$name}",
                    ], 422);
                }
                if (! isset($pendingNames[$name])) {
                    return response()->json([
                        'success' => false,
                        'message' => "Migration \"{$name}\" is not pending.",
                    ], 422);
                }
            }

            $outputs = [];
            foreach (array_keys($files) as $name) {
                if (! isset($requestSet[$name])) {
                    continue;
                }
                $path = $files[$name];
                $relative = 'database/migrations/'.basename($path);
                Artisan::call('migrate', [
                    '--force' => true,
                    '--path' => $relative,
                ]);
                $outputs[] = trim(Artisan::output());
                $this->rebindAdminAfterArtisan($admin);
            }

            $output = implode("\n", array_filter($outputs));

            Log::info('Migrations run by admin (selective)', [
                'admin_id' => $admin->id,
                'migrations' => $requested,
            ]);

            return response()->json([
                'success' => true,
                'message' => $output !== '' ? $output : 'Selected migrations completed.',
                'migration_status' => $this->getMigrationStatus(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Migrate failed from application settings', [
                'admin_id' => $admin->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run database seeders (php artisan db:seed --force).
     * - No body / no keys: run {@see \Database\Seeders\DatabaseSeeder}.
     * - { "not_recorded_only": true }: run each discovered seeder class that is not in {@code seed_runs}, in order.
     * - { "classes": ["Database\\Seeders\\FooSeeder", ...] }: run each class in order.
     */
    public function runSeed(Request $request)
    {
        $admin = $this->adminForArtisanRequest($request);

        $requested = $request->input('classes');

        try {
            if ($request->boolean('not_recorded_only')) {
                $classes = $this->getNotRecordedSeederClassNames();

                if (count($classes) === 0) {
                    return response()->json([
                        'success' => true,
                        'message' => 'All seeders are already recorded. Nothing to run.',
                    ]);
                }

                $outputs = [];
                foreach ($classes as $class) {
                    $exitCode = Artisan::call('db:seed', ['--force' => true, '--class' => $class]);
                    $outputs[] = trim(Artisan::output());
                    $this->rebindAdminAfterArtisan($admin);
                    $this->markSeederCompletedForUi($class, $exitCode);
                }

                $output = implode("\n", array_filter($outputs));

                Log::info('db:seed run by admin (not recorded only)', [
                    'admin_id' => $admin->id,
                    'classes' => $classes,
                ]);

                return response()->json([
                    'success' => true,
                    'message' => $output !== '' ? $output : 'Not recorded seeders completed.',
                ]);
            }

            if ($requested === null) {
                Artisan::call('db:seed', ['--force' => true]);
                $output = trim(Artisan::output());
                $this->rebindAdminAfterArtisan($admin);

                Log::info('db:seed run by admin (DatabaseSeeder)', ['admin_id' => $admin->id]);

                return response()->json([
                    'success' => true,
                    'message' => $output !== '' ? $output : 'Database seeding completed.',
                ]);
            }

            if (! is_array($requested)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid request: classes must be an array of seeder class names.',
                ], 422);
            }

            $requested = array_values(array_unique(array_filter($requested, fn ($c) => is_string($c) && $c !== '')));

            if (count($requested) === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Select at least one seeder class.',
                ], 422);
            }

            foreach ($requested as $class) {
                if (! str_starts_with($class, 'Database\\Seeders\\')) {
                    return response()->json([
                        'success' => false,
                        'message' => "Invalid seeder namespace: {$class}",
                    ], 422);
                }
                if ($class === 'Database\\Seeders\\DatabaseSeeder') {
                    return response()->json([
                        'success' => false,
                        'message' => 'Use “Run DatabaseSeeder” to run the main DatabaseSeeder without listing classes.',
                    ], 422);
                }
                if (! class_exists($class)) {
                    return response()->json([
                        'success' => false,
                        'message' => "Class not found: {$class}",
                    ], 422);
                }

                $ref = new \ReflectionClass($class);
                if ($ref->isAbstract() || ! $ref->isSubclassOf(\Illuminate\Database\Seeder::class)) {
                    return response()->json([
                        'success' => false,
                        'message' => "Not a valid seeder class: {$class}",
                    ], 422);
                }
            }

            $outputs = [];
            foreach ($requested as $class) {
                $exitCode = Artisan::call('db:seed', ['--force' => true, '--class' => $class]);
                $outputs[] = trim(Artisan::output());
                $this->rebindAdminAfterArtisan($admin);
                $this->markSeederCompletedForUi($class, $exitCode);
            }

            $output = implode("\n", array_filter($outputs));

            Log::info('db:seed run by admin (selective)', [
                'admin_id' => $admin->id,
                'classes' => $requested,
            ]);

            return response()->json([
                'success' => true,
                'message' => $output !== '' ? $output : 'Selected seeders completed.',
            ]);
        } catch (\Throwable $e) {
            Log::error('Seed failed from application settings', [
                'admin_id' => $admin->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Optimize the application
     */
    public function optimize(Request $request)
    {
        // Only allow admin access
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        try {
            $results = [];

            // Clear config cache
            Artisan::call('config:clear');
            $results[] = ['action' => 'config:clear', 'status' => 'success', 'message' => 'Configuration cache cleared'];

            // Clear route cache
            Artisan::call('route:clear');
            $results[] = ['action' => 'route:clear', 'status' => 'success', 'message' => 'Route cache cleared'];

            // Clear view cache
            Artisan::call('view:clear');
            $results[] = ['action' => 'view:clear', 'status' => 'success', 'message' => 'View cache cleared'];

            // Clear application cache
            Artisan::call('cache:clear');
            $results[] = ['action' => 'cache:clear', 'status' => 'success', 'message' => 'Application cache cleared'];

            // Optimize autoloader
            Artisan::call('optimize:clear');
            $results[] = ['action' => 'optimize:clear', 'status' => 'success', 'message' => 'Optimization cleared'];

            // Re-optimize (this includes config:cache, route:cache, view:cache)
            try {
                Artisan::call('optimize');
                $results[] = ['action' => 'optimize', 'status' => 'success', 'message' => 'Application optimized'];
            } catch (\Exception $e) {
                // If optimize fails, try individual steps
                $optimizeError = $e->getMessage();
                
                // Try config cache separately
                try {
                    Artisan::call('config:cache');
                    $results[] = ['action' => 'config:cache', 'status' => 'success', 'message' => 'Configuration cached'];
                } catch (\Exception $e) {
                    $results[] = ['action' => 'config:cache', 'status' => 'error', 'message' => 'Config cache failed: ' . $e->getMessage()];
                }
                
                // Try route cache separately
                // For domain-based routing, duplicate route names are allowed across different domains
                try {
                    Artisan::call('route:cache');
                    $results[] = ['action' => 'route:cache', 'status' => 'success', 'message' => 'Routes cached'];
                } catch (\Exception $e) {
                    $errorMessage = $e->getMessage();
                    $hasDomainRouting = $this->hasDomainBasedRouting();
                    
                    if (str_contains($errorMessage, 'already been assigned name') || str_contains($errorMessage, 'serialization')) {
                        if ($hasDomainRouting) {
                            // For domain-based routing, duplicate route names are allowed across different domains
                            // Laravel's route caching doesn't support this natively, but routes work fine at runtime
                            // Route caching is skipped for domain-based setups with duplicate names
                            $results[] = ['action' => 'route:cache', 'status' => 'skipped', 'message' => 'Route caching skipped (domain-based routing: same route names allowed per domain)'];
                        } else {
                            $results[] = ['action' => 'route:cache', 'status' => 'skipped', 'message' => 'Route caching skipped (duplicate route names detected)'];
                        }
                    } else {
                        $results[] = ['action' => 'route:cache', 'status' => 'error', 'message' => 'Route cache failed: ' . $errorMessage];
                    }
                }
                
                // Try view cache separately
                try {
                    Artisan::call('view:cache');
                    $results[] = ['action' => 'view:cache', 'status' => 'success', 'message' => 'Views cached'];
                } catch (\Exception $e) {
                    $results[] = ['action' => 'view:cache', 'status' => 'skipped', 'message' => 'View caching skipped: ' . $e->getMessage()];
                }
                
                // Don't throw - we've handled individual steps
                $results[] = ['action' => 'optimize', 'status' => 'partial', 'message' => 'Optimization completed with some skipped steps'];
            }

            Log::info('Application optimized by admin', [
                'admin_id' => $request->user()->id,
                'results' => $results,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Application optimized successfully',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Application optimization failed', [
                'admin_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to optimize application: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Clear application caches
     */
    public function clear(Request $request)
    {
        // Only allow admin access
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        try {
            $results = [];
            $clearType = $request->input('type', 'all'); // all, cache, config, route, view

            if ($clearType === 'all' || $clearType === 'cache') {
                Artisan::call('cache:clear');
                $results[] = ['action' => 'cache:clear', 'status' => 'success', 'message' => 'Application cache cleared'];
            }

            if ($clearType === 'all' || $clearType === 'config') {
                Artisan::call('config:clear');
                $results[] = ['action' => 'config:clear', 'status' => 'success', 'message' => 'Configuration cache cleared'];
            }

            if ($clearType === 'all' || $clearType === 'route') {
                Artisan::call('route:clear');
                $results[] = ['action' => 'route:clear', 'status' => 'success', 'message' => 'Route cache cleared'];
            }

            if ($clearType === 'all' || $clearType === 'view') {
                Artisan::call('view:clear');
                $results[] = ['action' => 'view:clear', 'status' => 'success', 'message' => 'View cache cleared'];
            }

            if ($clearType === 'all') {
                Artisan::call('optimize:clear');
                $results[] = ['action' => 'optimize:clear', 'status' => 'success', 'message' => 'Optimization cleared'];
            }

            Log::info('Application cache cleared by admin', [
                'admin_id' => $request->user()->id,
                'type' => $clearType,
                'results' => $results,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Cache cleared successfully',
                'results' => $results,
            ]);
        } catch (\Exception $e) {
            Log::error('Cache clear failed', [
                'admin_id' => $request->user()->id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to clear cache: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get cache statistics
     */
    private function getCacheStats(): array
    {
        try {
            $cacheDriver = config('cache.default');
            $cachePrefix = config('cache.prefix');
            
            return [
                'driver' => $cacheDriver,
                'prefix' => $cachePrefix,
            ];
        } catch (\Exception $e) {
            return [
                'driver' => 'unknown',
                'prefix' => 'unknown',
            ];
        }
    }

    /**
     * Public storage symlink status (public/storage → storage/app/public).
     */
    private function getPublicStorageLinkStatus(): array
    {
        $links = $this->getConfiguredStorageLinks();
        $linkPath = array_key_first($links);
        $targetPath = $links[$linkPath];

        $targetExists = is_dir($targetPath);
        $linkExists = file_exists($linkPath);
        $isSymlink = is_link($linkPath);

        $connected = $targetExists && $linkExists && $this->isPublicStorageConnected($linkPath, $targetPath);

        $linkIsDirectoryNotSymlink = $linkExists && ! $connected && is_dir($linkPath) && ! $isSymlink;

        return [
            'connected' => $connected,
            'needs_connect' => $targetExists && ! $connected,
            'target_exists' => $targetExists,
            'link_exists' => $linkExists,
            'link_is_symlink' => $isSymlink,
            'link_is_directory_not_symlink' => $linkIsDirectoryNotSymlink,
            'link_path' => $linkPath,
            'target_path' => $targetPath,
        ];
    }

    /**
     * Pending migrations (compares filesystem to migrations table when present).
     */
    private function getMigrationStatus(): array
    {
        try {
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles([database_path('migrations')]);

            if (! $migrator->repositoryExists()) {
                $names = array_keys($files);

                return [
                    'check_error' => null,
                    'pending_count' => count($names),
                    'pending_names' => array_slice($names, 0, 25),
                    'repository_exists' => false,
                    'has_pending' => count($names) > 0,
                ];
            }

            $ran = $migrator->getRepository()->getRan();
            $pendingNames = collect($files)
                ->keys()
                ->reject(fn (string $name) => in_array($name, $ran, true))
                ->values()
                ->all();

            return [
                'check_error' => null,
                'pending_count' => count($pendingNames),
                'pending_names' => array_slice($pendingNames, 0, 25),
                'repository_exists' => true,
                'has_pending' => count($pendingNames) > 0,
            ];
        } catch (\Throwable $e) {
            Log::warning('Migration status check failed', ['error' => $e->getMessage()]);

            return [
                'check_error' => $e->getMessage(),
                'pending_count' => null,
                'pending_names' => [],
                'repository_exists' => null,
                'has_pending' => false,
            ];
        }
    }

    /**
     * Full migration list for the Configuration tab (ran vs pending, batch).
     * Filter + pagination via query: migration_q, migration_page, migration_per_page.
     *
     * @return array<string, mixed>
     */
    private function getMigrationsConfiguration(Request $request): array
    {
        try {
            $migrator = app('migrator');
            $files = $migrator->getMigrationFiles([database_path('migrations')]);
            ksort($files);

            $batches = [];
            $repositoryExists = $migrator->repositoryExists();
            if ($repositoryExists) {
                $batches = DB::table('migrations')->pluck('batch', 'migration')->all();
            }

            $allItems = [];
            foreach ($files as $name => $path) {
                $ran = array_key_exists($name, $batches);
                $allItems[] = [
                    'name' => $name,
                    'path' => 'database/migrations/'.basename($path),
                    'status' => $ran ? 'ran' : 'pending',
                    'batch' => $ran ? (int) $batches[$name] : null,
                ];
            }

            $ranCount = count(array_filter($allItems, fn (array $i) => $i['status'] === 'ran'));

            $q = trim((string) $request->query('migration_q', ''));
            $page = max(1, (int) $request->query('migration_page', 1));
            $perPage = max(1, min(100, (int) $request->query('migration_per_page', 25)));

            $filtered = $allItems;
            if ($q !== '') {
                $ql = mb_strtolower($q);
                $filtered = array_values(array_filter($allItems, function (array $m) use ($ql) {
                    if (str_contains(mb_strtolower($m['name']), $ql)) {
                        return true;
                    }
                    if (str_contains(mb_strtolower($m['path']), $ql)) {
                        return true;
                    }
                    if ($m['status'] === 'ran' && str_contains((string) ($m['batch'] ?? ''), $ql)) {
                        return true;
                    }

                    return false;
                }));
            }

            $totalFiltered = count($filtered);
            $lastPage = max(1, (int) ceil($totalFiltered / $perPage));
            $page = min($page, $lastPage);
            $offset = ($page - 1) * $perPage;
            $pageItems = array_slice($filtered, $offset, $perPage);

            return [
                'check_error' => null,
                'repository_exists' => $repositoryExists,
                'ran_count' => $ranCount,
                'pending_count' => count($allItems) - $ranCount,
                'filter' => $q,
                'page' => $page,
                'per_page' => $perPage,
                'total_filtered' => $totalFiltered,
                'last_page' => $lastPage,
                'items' => $pageItems,
            ];
        } catch (\Throwable $e) {
            Log::warning('Migrations configuration list failed', ['error' => $e->getMessage()]);

            return [
                'check_error' => $e->getMessage(),
                'repository_exists' => false,
                'ran_count' => 0,
                'pending_count' => 0,
                'filter' => '',
                'page' => 1,
                'per_page' => 25,
                'total_filtered' => 0,
                'last_page' => 1,
                'items' => [],
            ];
        }
    }

    /**
     * Seeder classes under database/seeders vs seed_runs table.
     * Filter + pagination via query: seeder_q, seeder_page, seeder_per_page.
     *
     * @return array<string, mixed>
     */
    private function getSeedersConfiguration(Request $request): array
    {
        try {
            $tableExists = Schema::hasTable('seed_runs');
            $records = [];
            if ($tableExists) {
                $records = DB::table('seed_runs')->get()->keyBy('seeder');
            }

            $allItems = [];
            $pattern = database_path('seeders').DIRECTORY_SEPARATOR.'*.php';
            foreach (glob($pattern) ?: [] as $file) {
                $shortName = basename($file, '.php');
                if ($shortName === 'DatabaseSeeder') {
                    continue;
                }

                $class = 'Database\\Seeders\\'.$shortName;
                if (! class_exists($class)) {
                    continue;
                }

                $ref = new \ReflectionClass($class);
                if ($ref->isAbstract() || ! $ref->isSubclassOf(\Illuminate\Database\Seeder::class)) {
                    continue;
                }

                $row = $records[$class] ?? null;
                $lastRun = null;
                if ($row !== null) {
                    $raw = $row->updated_at ?? $row->created_at ?? null;
                    $lastRun = $raw !== null ? (string) $raw : null;
                }

                $allItems[] = [
                    'class' => $class,
                    'short_name' => $shortName,
                    'seeded' => $row !== null,
                    'last_run_at' => $lastRun,
                ];
            }

            usort($allItems, fn (array $a, array $b) => strcmp($a['short_name'], $b['short_name']));

            $seededCount = count(array_filter($allItems, fn (array $i) => $i['seeded']));

            $q = trim((string) $request->query('seeder_q', ''));
            $page = max(1, (int) $request->query('seeder_page', 1));
            $perPage = max(1, min(100, (int) $request->query('seeder_per_page', 25)));

            $filtered = $allItems;
            if ($q !== '') {
                $ql = mb_strtolower($q);
                $filtered = array_values(array_filter($allItems, function (array $s) use ($ql) {
                    return str_contains(mb_strtolower($s['short_name']), $ql)
                        || str_contains(mb_strtolower($s['class']), $ql);
                }));
            }

            $totalFiltered = count($filtered);
            $lastPage = max(1, (int) ceil($totalFiltered / $perPage));
            $page = min($page, $lastPage);
            $offset = ($page - 1) * $perPage;
            $pageItems = array_slice($filtered, $offset, $perPage);

            return [
                'check_error' => null,
                'table_exists' => $tableExists,
                'seeded_count' => $seededCount,
                'not_seeded_count' => count($allItems) - $seededCount,
                'filter' => $q,
                'page' => $page,
                'per_page' => $perPage,
                'total_filtered' => $totalFiltered,
                'last_page' => $lastPage,
                'items' => array_values($pageItems),
            ];
        } catch (\Throwable $e) {
            Log::warning('Seeders configuration list failed', ['error' => $e->getMessage()]);

            return [
                'check_error' => $e->getMessage(),
                'table_exists' => false,
                'seeded_count' => 0,
                'not_seeded_count' => 0,
                'filter' => '',
                'page' => 1,
                'per_page' => 25,
                'total_filtered' => 0,
                'last_page' => 1,
                'items' => [],
            ];
        }
    }

    /**
     * Seeder classes discovered on disk that are not present in {@see seed_runs} (same rules as {@see getSeedersConfiguration}).
     * When {@code seed_runs} does not exist yet, every discovered class is treated as not recorded.
     *
     * @return list<string>
     */
    private function getNotRecordedSeederClassNames(): array
    {
        $tableExists = Schema::hasTable('seed_runs');
        $records = [];
        if ($tableExists) {
            $records = DB::table('seed_runs')->get()->keyBy('seeder');
        }

        $classes = [];
        $pattern = database_path('seeders').DIRECTORY_SEPARATOR.'*.php';
        foreach (glob($pattern) ?: [] as $file) {
            $shortName = basename($file, '.php');
            if ($shortName === 'DatabaseSeeder') {
                continue;
            }

            $class = 'Database\\Seeders\\'.$shortName;
            if (! class_exists($class)) {
                continue;
            }

            $ref = new \ReflectionClass($class);
            if ($ref->isAbstract() || ! $ref->isSubclassOf(\Illuminate\Database\Seeder::class)) {
                continue;
            }

            if (isset($records[$class])) {
                continue;
            }

            $classes[] = $class;
        }

        sort($classes);

        return array_values($classes);
    }

    private function pathsEqual(string $a, string $b): bool
    {
        $norm = static function (string $p): string {
            $p = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $p);

            return rtrim($p, DIRECTORY_SEPARATOR);
        };

        return strcasecmp($norm($a), $norm($b)) === 0;
    }

    /**
     * Get storage statistics
     */
    private function getStorageStats(): array
    {
        try {
            $storagePath = storage_path();
            $logsPath = storage_path('logs');
            $cachePath = storage_path('framework/cache');
            
            $logsSize = $this->getDirectorySize($logsPath);
            $cacheSize = $this->getDirectorySize($cachePath);
            $totalSize = $this->getDirectorySize($storagePath);

            return [
                'logs_size' => $logsSize,
                'cache_size' => $cacheSize,
                'total_size' => $totalSize,
                'logs_size_formatted' => $this->formatBytes($logsSize),
                'cache_size_formatted' => $this->formatBytes($cacheSize),
                'total_size_formatted' => $this->formatBytes($totalSize),
            ];
        } catch (\Exception $e) {
            return [
                'logs_size' => 0,
                'cache_size' => 0,
                'total_size' => 0,
                'logs_size_formatted' => '0 B',
                'cache_size_formatted' => '0 B',
                'total_size_formatted' => '0 B',
            ];
        }
    }

    /**
     * Get directory size in bytes
     */
    private function getDirectorySize(string $directory): int
    {
        $size = 0;
        if (is_dir($directory)) {
            foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($directory)) as $file) {
                if ($file->isFile()) {
                    $size += $file->getSize();
                }
            }
        }
        return $size;
    }

    /**
     * Format bytes to human readable format
     */
    private function formatBytes(int $bytes, int $precision = 2): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }
        
        return round($bytes, $precision) . ' ' . $units[$i];
    }

    /**
     * Check if the application uses domain-based routing
     */
    private function hasDomainBasedRouting(): bool
    {
        try {
            // Check if livestock domain is configured (indicates domain-based routing)
            $livestockDomain = config('livestock.domain');
            if ($livestockDomain && $livestockDomain !== '127.0.0.1') {
                return true;
            }
            
            // Check routes/web.php for Route::domain() usage
            $webRoutesPath = base_path('routes/web.php');
            if (file_exists($webRoutesPath)) {
                $content = file_get_contents($webRoutesPath);
                if (str_contains($content, 'Route::domain(')) {
                    return true;
                }
            }
            
            return false;
        } catch (\Exception $e) {
            Log::warning('Error checking for domain-based routing', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Update footer settings
     */
    public function updateFooter(Request $request)
    {
        // Only allow admin access
        if ($request->user()->role !== 'admin') {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
            'social_links' => 'nullable|array',
            'social_links.facebook' => 'nullable|string|max:255',
            'social_links.twitter' => 'nullable|string|max:255',
            'social_links.instagram' => 'nullable|string|max:255',
            'social_links.linkedin' => 'nullable|string|max:255',
            'quick_links' => 'nullable|array',
            'quick_links.*.title' => 'nullable|string|max:100',
            'quick_links.*.url' => 'nullable|string|max:255',
            'contact_email' => 'nullable|email|max:255',
            'contact_phone' => 'nullable|string|max:50',
            'contact_address' => 'nullable|string|max:500',
            'copyright_text' => 'nullable|string|max:200',
            'legal_links' => 'nullable|array',
            'legal_links.*.title' => 'nullable|string|max:100',
            'legal_links.*.url' => 'nullable|string|max:255',
        ]);

        // Filter out empty values from arrays
        if (isset($validated['quick_links'])) {
            $validated['quick_links'] = array_filter($validated['quick_links'], function($link) {
                return !empty($link['title']) || !empty($link['url']);
            });
            $validated['quick_links'] = array_values($validated['quick_links']); // Re-index array
        }

        if (isset($validated['legal_links'])) {
            $validated['legal_links'] = array_filter($validated['legal_links'], function($link) {
                return !empty($link['title']) || !empty($link['url']);
            });
            $validated['legal_links'] = array_values($validated['legal_links']); // Re-index array
        }

        // Store as JSON
        AdminSetting::set('footer_settings', $validated, 'json');

        Log::info('Footer settings updated by admin', [
            'admin_id' => $request->user()->id,
        ]);

        return redirect()->back()->with('success', 'Footer settings updated successfully');
    }
}

