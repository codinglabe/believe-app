<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;

class VerifyEmailNotification extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * The domain to use for verification URL
     */
    public ?string $domain = null;

    /**
     * Create a new notification instance.
     */
    public function __construct(?string $domain = null)
    {
        $this->domain = $domain;
    }

    /**
     * Build the mail representation of the notification.
     *
     * @param  mixed  $notifiable
     * @return \Illuminate\Notifications\Messages\MailMessage
     */
    public function toMail($notifiable)
    {
        try {
            $verificationUrl = $this->verificationUrl($notifiable);

            // Determine app name based on domain
            $appName = $this->getAppNameForDomain();

            Log::info('Sending verification email', [
                'user_id' => $notifiable->getKey(),
                'user_email' => $notifiable->getEmailForVerification(),
                'domain' => $this->domain,
                'verification_url' => $verificationUrl,
                'mailer' => config('mail.default'),
                'app_name' => $appName,
            ]);

            return (new MailMessage)
                ->subject('Verify Your Email Address - ' . $appName)
                ->view('emails.verify-email', [
                    'verificationUrl' => $verificationUrl,
                    'notifiable' => $notifiable,
                    'appName' => $appName,
                ]);
        } catch (\Exception $e) {
            Log::error('Error in toMail method', [
                'user_id' => $notifiable->getKey(),
                'user_email' => $notifiable->getEmailForVerification(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            throw $e;
        }
    }

    /**
     * Get the app name based on the domain
     *
     * @return string
     */
    protected function getAppNameForDomain(): string
    {
        if (!$this->domain) {
            // Fallback: determine by user type if domain not provided
            return config('app.name');
        }

        // Extract host from the domain
        $parsedDomain = parse_url($this->domain);
        $requestHost = $parsedDomain['host'] ?? null;
        
        if (!$requestHost) {
            // If parsing failed, try to extract host manually
            $requestHost = str_replace(['http://', 'https://'], '', $this->domain);
            $requestHost = explode('/', $requestHost)[0];
            $requestHost = explode(':', $requestHost)[0];
        }

        $requestHost = strtolower(trim($requestHost));

        // Check if it's livestock domain
        $livestockDomain = config('livestock.domain');
        if ($livestockDomain && $requestHost) {
            $livestockHost = parse_url($livestockDomain, PHP_URL_HOST) ?? $livestockDomain;
            if (str_contains($livestockHost, '://')) {
                $livestockHost = parse_url($livestockHost, PHP_URL_HOST) ?? $livestockHost;
            }
            $livestockHost = strtolower(trim($livestockHost));
            
            if ($requestHost === $livestockHost) {
                return 'Bid A Livestock';
            }
        }

        // Check if it's merchant domain
        $merchantDomain = config('merchant.domain');
        if ($merchantDomain && $requestHost) {
            $merchantHost = parse_url($merchantDomain, PHP_URL_HOST) ?? $merchantDomain;
            if (str_contains($merchantHost, '://')) {
                $merchantHost = parse_url($merchantHost, PHP_URL_HOST) ?? $merchantHost;
            }
            $merchantHost = strtolower(trim($merchantHost));
            
            if ($requestHost === $merchantHost) {
                // Use merchant name from config or default
                return config('merchant.name', 'Merchant');
            }
        }

        // Default app name
        return config('app.name');
    }

    /**
     * Handle a job failure.
     *
     * @param  \Throwable  $exception
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('VerifyEmailNotification job failed', [
            'domain' => $this->domain,
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString(),
        ]);
    }

    /**
     * Get the verification URL for the given notifiable.
     *
     * @param  mixed  $notifiable
     * @return string
     */
    protected function verificationUrl($notifiable)
    {
        // Store original APP_URL
        $originalAppUrl = config('app.url');
        $baseUrl = $originalAppUrl;
        $routeName = 'verification.verify';
        
        // Use the domain passed from request context (where user is accessing from)
        if ($this->domain) {
            // Clean and normalize the domain
            $domain = trim($this->domain);
            
            // Ensure it has a scheme
            if (!str_contains($domain, '://')) {
                $domain = 'https://' . $domain;
            }
            
            // Use the passed domain directly - this is where the user is accessing from
            $baseUrl = $domain;
            
            // Determine route based on domain
            $livestockDomain = config('livestock.domain');
            $merchantDomain = config('merchant.domain');
            
            // Extract host from the domain
            $parsedDomain = parse_url($domain);
            $requestHost = $parsedDomain['host'] ?? null;
            
            if (!$requestHost) {
                // If parsing failed, try to extract host manually
                $requestHost = str_replace(['http://', 'https://'], '', $domain);
                $requestHost = explode('/', $requestHost)[0];
                $requestHost = explode(':', $requestHost)[0];
            }
            
            // Log for debugging
            Log::info('Email verification URL generation', [
                'passed_domain' => $this->domain,
                'normalized_domain' => $domain,
                'request_host' => $requestHost,
                'livestock_domain' => $livestockDomain,
                'base_url' => $baseUrl,
            ]);
            
            // Check if it's livestock domain
            if ($livestockDomain && $requestHost) {
                $livestockHost = parse_url($livestockDomain, PHP_URL_HOST) ?? $livestockDomain;
                if (str_contains($livestockHost, '://')) {
                    $livestockHost = parse_url($livestockHost, PHP_URL_HOST) ?? $livestockHost;
                }
                $livestockHost = strtolower(trim($livestockHost));
                $requestHostLower = strtolower(trim($requestHost));
                
                if ($requestHostLower === $livestockHost) {
                    // User is on livestock domain - use livestock route
                    $routeName = 'livestock.verification.verify';
                    Log::info('Using livestock route', ['host' => $requestHostLower]);
                } else {
                    Log::info('Not livestock domain', [
                        'request_host' => $requestHostLower,
                        'livestock_host' => $livestockHost,
                    ]);
                }
            }
            
            // Check if it's merchant domain (only if not livestock)
            if ($merchantDomain && $routeName === 'verification.verify' && $requestHost) {
                $merchantHost = parse_url($merchantDomain, PHP_URL_HOST) ?? $merchantDomain;
                if (str_contains($merchantHost, '://')) {
                    $merchantHost = parse_url($merchantHost, PHP_URL_HOST) ?? $merchantHost;
                }
                $merchantHost = strtolower(trim($merchantHost));
                $requestHostLower = strtolower(trim($requestHost));
                
                if ($requestHostLower === $merchantHost) {
                    // User is on merchant domain - use main verification route
                    // (merchant uses main verification route)
                }
            }
        } else {
            // Fallback: determine by user type if domain not provided
            $livestockDomain = config('livestock.domain');
            $merchantDomain = config('merchant.domain');
            $isLivestockUser = $notifiable instanceof \App\Models\LivestockUser;
            $isMerchantUser = $notifiable instanceof \App\Models\Merchant;
            
            if ($isLivestockUser && $livestockDomain) {
                $baseUrl = str_contains($livestockDomain, '://') ? $livestockDomain : 'https://' . $livestockDomain;
                $routeName = 'livestock.verification.verify';
            } elseif ($isMerchantUser && $merchantDomain) {
                $baseUrl = str_contains($merchantDomain, '://') ? $merchantDomain : 'https://' . $merchantDomain;
                // Merchant uses main verification route
            } else {
                // Main app user - use main domain from env
                $envAppUrl = env('APP_URL');
                if ($envAppUrl) {
                    $baseUrl = $envAppUrl;
                }
            }
        }

        // Temporarily set APP_URL for URL generation
        // CRITICAL: Force the base URL before generating the route
        Config::set('app.url', $baseUrl);
        URL::forceRootUrl($baseUrl);
        
        // Also set the trusted proxies and hosts to ensure correct URL generation
        $parsedBaseUrl = parse_url($baseUrl);
        $baseHost = $parsedBaseUrl['host'] ?? null;
        
        Log::info('Before URL generation', [
            'base_url' => $baseUrl,
            'base_host' => $baseHost,
            'route_name' => $routeName,
            'config_app_url' => config('app.url'),
            'forced_root_url' => URL::to('/'),
        ]);

        try {
            $verificationUrl = URL::temporarySignedRoute(
                $routeName,
                Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );
            
            // Ensure the URL uses the correct domain
            $parsedUrl = parse_url($verificationUrl);
            if ($parsedUrl && isset($parsedUrl['host'])) {
                // If the generated URL has wrong host, replace it
                if (strtolower($parsedUrl['host']) !== strtolower($baseHost)) {
                    $scheme = $parsedUrl['scheme'] ?? 'https';
                    $path = $parsedUrl['path'] ?? '';
                    $query = isset($parsedUrl['query']) ? '?' . $parsedUrl['query'] : '';
                    $fragment = isset($parsedUrl['fragment']) ? '#' . $parsedUrl['fragment'] : '';
                    $verificationUrl = $scheme . '://' . $baseHost . $path . $query . $fragment;
                    
                    Log::warning('URL host mismatch - corrected', [
                        'original_host' => $parsedUrl['host'],
                        'correct_host' => $baseHost,
                        'corrected_url' => $verificationUrl,
                    ]);
                }
            }
            
            Log::info('Generated verification URL', [
                'verification_url' => $verificationUrl,
                'base_url' => $baseUrl,
                'route_name' => $routeName,
            ]);
        } finally {
            // Restore original APP_URL
            Config::set('app.url', $originalAppUrl);
            URL::forceRootUrl(null);
        }

        return $verificationUrl;
    }
}
