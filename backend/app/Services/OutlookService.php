<?php

namespace App\Services;

use App\Models\EmailConnection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OutlookService
{
    protected $connection;
    protected $baseUrl = 'https://graph.microsoft.com/v1.0';

    public function __construct(EmailConnection $connection)
    {
        $this->connection = $connection;
    }

    /**
     * Get authorization URL
     */
    public function getAuthUrl(): string
    {
        $clientId = config('services.outlook.client_id');
        $redirectUri = config('services.outlook.redirect_uri');
        $scopes = urlencode('https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Contacts.Read offline_access');

        return "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?" .
            "client_id={$clientId}&" .
            "response_type=code&" .
            "redirect_uri=" . urlencode($redirectUri) . "&" .
            "response_mode=query&" .
            "scope={$scopes}&" .
            "state=" . bin2hex(random_bytes(16));
    }

    /**
     * Exchange authorization code for tokens
     */
    public function handleCallback(string $code): array
    {
        try {
            $clientId = config('services.outlook.client_id');
            $clientSecret = config('services.outlook.client_secret');
            $redirectUri = config('services.outlook.redirect_uri');

            $response = Http::asForm()->post('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'code' => $code,
                'redirect_uri' => $redirectUri,
                'grant_type' => 'authorization_code',
            ]);

            if (!$response->successful()) {
                throw new \Exception('Error fetching access token: ' . $response->body());
            }

            $token = $response->json();

            // Get user info
            $userResponse = Http::withToken($token['access_token'])
                ->get("{$this->baseUrl}/me");

            if (!$userResponse->successful()) {
                throw new \Exception('Error fetching user info: ' . $userResponse->body());
            }

            $userInfo = $userResponse->json();

            return [
                'access_token' => $token['access_token'],
                'refresh_token' => $token['refresh_token'],
                'id_token' => $token['id_token'] ?? null,
                'token_expires_at' => isset($token['expires_in']) 
                    ? now()->addSeconds($token['expires_in']) 
                    : null,
                'email' => $userInfo['mail'] ?? $userInfo['userPrincipalName'],
                'token_metadata' => $token,
            ];
        } catch (\Exception $e) {
            Log::error('Outlook OAuth callback error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Refresh access token
     */
    public function refreshToken(): bool
    {
        try {
            if (!$this->connection->refresh_token) {
                return false;
            }

            $clientId = config('services.outlook.client_id');
            $clientSecret = config('services.outlook.client_secret');

            $response = Http::asForm()->post('https://login.microsoftonline.com/common/oauth2/v2.0/token', [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'refresh_token' => $this->connection->refresh_token,
                'grant_type' => 'refresh_token',
            ]);

            if (!$response->successful()) {
                return false;
            }

            $token = $response->json();

            $this->connection->update([
                'access_token' => $token['access_token'],
                'refresh_token' => $token['refresh_token'] ?? $this->connection->refresh_token,
                'token_expires_at' => isset($token['expires_in']) 
                    ? now()->addSeconds($token['expires_in']) 
                    : null,
                'token_metadata' => $token,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Outlook token refresh error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get access token (refresh if needed)
     */
    protected function getAccessToken(): string
    {
        if ($this->connection->isTokenExpired()) {
            $this->refreshToken();
        }

        return $this->connection->access_token;
    }

    /**
     * Get contacts from Outlook
     */
    public function getContacts(): array
    {
        try {
            $accessToken = $this->getAccessToken();
            $contacts = [];
            $nextLink = "{$this->baseUrl}/me/contacts";

            do {
                $response = Http::withToken($accessToken)->get($nextLink);

                if (!$response->successful()) {
                    throw new \Exception('Error fetching contacts: ' . $response->body());
                }

                $data = $response->json();

                foreach ($data['value'] ?? [] as $contact) {
                    $emailAddresses = $contact['emailAddresses'] ?? [];
                    
                    if (count($emailAddresses) > 0) {
                        $email = $emailAddresses[0]['address'];
                        $name = $contact['displayName'] ?? null;

                        if ($email) {
                            $contacts[] = [
                                'email' => $email,
                                'name' => $name,
                                'provider_contact_id' => $contact['id'],
                                'metadata' => [
                                    'id' => $contact['id'],
                                    'given_name' => $contact['givenName'] ?? null,
                                    'surname' => $contact['surname'] ?? null,
                                ],
                            ];
                        }
                    }
                }

                $nextLink = $data['@odata.nextLink'] ?? null;
            } while ($nextLink);

            return $contacts;
        } catch (\Exception $e) {
            Log::error('Outlook get contacts error: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Get recent senders from Outlook
     * Fetches all messages by paginating through results
     */
    public function getRecentSenders(int $limit = 1000): array
    {
        try {
            $accessToken = $this->getAccessToken();
            $senders = [];
            $seenEmails = [];
            $nextLink = "{$this->baseUrl}/me/messages";
            $totalFetched = 0;
            $maxPerPage = 100; // Microsoft Graph max per page

            do {
                $params = [
                    '$top' => min($maxPerPage, $limit - $totalFetched),
                    '$select' => 'from,subject',
                    '$orderby' => 'receivedDateTime desc',
                ];

                $response = Http::withToken($accessToken)->get($nextLink, $params);

                if (!$response->successful()) {
                    throw new \Exception('Error fetching messages: ' . $response->body());
                }

                $data = $response->json();

                foreach ($data['value'] ?? [] as $message) {
                    $from = $message['from'] ?? null;

                    if ($from && isset($from['emailAddress'])) {
                        $email = $from['emailAddress']['address'];
                        $name = $from['emailAddress']['name'] ?? null;
                        $emailLower = strtolower($email);

                        if ($email && !in_array($emailLower, $seenEmails) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                            $seenEmails[] = $emailLower;
                            $senders[] = [
                                'email' => $email,
                                'name' => $name,
                                'provider_contact_id' => $message['id'],
                                'metadata' => [
                                    'subject' => $message['subject'] ?? null,
                                    'message_id' => $message['id'],
                                ],
                            ];
                        }
                    }
                }

                $totalFetched += count($data['value'] ?? []);
                $nextLink = $data['@odata.nextLink'] ?? null;

                // Stop if we've reached the limit or no more pages
                if ($totalFetched >= $limit || !$nextLink) {
                    break;
                }
            } while ($nextLink && $totalFetched < $limit);

            Log::info("Fetched {$totalFetched} messages, extracted " . count($senders) . " unique senders");
            return $senders;
        } catch (\Exception $e) {
            Log::error('Outlook get recent senders error: ' . $e->getMessage());
            throw $e;
        }
    }
}

