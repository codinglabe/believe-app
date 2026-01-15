<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationSettingsController extends Controller
{
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

        return Inertia::render('settings/application', [
            'cache_stats' => $this->getCacheStats(),
            'storage_stats' => $this->getStorageStats(),
            'footer_settings' => $footerSettings,
        ]);
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

