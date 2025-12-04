<?php

namespace App\Services;

use App\Models\EmailConnection;
use Google_Client;
use Google_Service_Gmail;
use Google_Service_PeopleService;
use Illuminate\Support\Facades\Log;

class GmailService
{
    protected $client;
    protected $connection;

    public function __construct(EmailConnection $connection)
    {
        $this->connection = $connection;
        $this->client = new Google_Client();
        
        $clientId = config('services.gmail.client_id');
        $clientSecret = config('services.gmail.client_secret');
        $redirectUri = config('services.gmail.redirect_uri');
        
        if (!$clientId || !$clientSecret) {
            throw new \Exception('Gmail API credentials not configured. Please set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your .env file.');
        }
        
        $this->client->setClientId($clientId);
        $this->client->setClientSecret($clientSecret);
        $this->client->setRedirectUri($redirectUri);
        $this->client->setScopes([
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/contacts.readonly',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
        ]);
        $this->client->setAccessType('offline');
        $this->client->setPrompt('consent');

        // Set existing tokens if available
        if ($connection->access_token) {
            $expiresIn = $connection->token_expires_at 
                ? max(0, $connection->token_expires_at->diffInSeconds(now())) 
                : 3600;
            
            $this->client->setAccessToken([
                'access_token' => $connection->access_token,
                'refresh_token' => $connection->refresh_token,
                'expires_in' => $expiresIn,
                'created' => $connection->created_at ? $connection->created_at->timestamp : time(),
            ]);
        }
    }

    /**
     * Get authorization URL
     */
    public function getAuthUrl(): string
    {
        return $this->client->createAuthUrl();
    }

    /**
     * Exchange authorization code for tokens
     */
    public function handleCallback(string $code): array
    {
        try {
            $token = $this->client->fetchAccessTokenWithAuthCode($code);
            
            if (isset($token['error'])) {
                Log::error('Gmail token error: ' . json_encode($token));
                throw new \Exception('Error fetching access token: ' . ($token['error_description'] ?? $token['error']));
            }

            // Ensure we have an access token
            if (!isset($token['access_token'])) {
                Log::error('Gmail token missing access_token: ' . json_encode($token));
                throw new \Exception('Access token not received from Google');
            }

            $this->client->setAccessToken($token);

            // Get user info - try to get email from token or userinfo API
            $email = null;
            
            try {
                $oauth2 = new \Google_Service_Oauth2($this->client);
                $userInfo = $oauth2->userinfo->get();
                $email = $userInfo->email;
            } catch (\Exception $e) {
                Log::warning('Could not fetch user info from OAuth2 API: ' . $e->getMessage());
                
                // Try to get email from ID token if available
                if (isset($token['id_token'])) {
                    try {
                        $idTokenParts = explode('.', $token['id_token']);
                        if (count($idTokenParts) === 3) {
                            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $idTokenParts[1])), true);
                            $email = $payload['email'] ?? null;
                        }
                    } catch (\Exception $idTokenError) {
                        Log::warning('Could not decode ID token: ' . $idTokenError->getMessage());
                    }
                }
                
                // If still no email, we'll need to get it later or use a placeholder
                if (!$email) {
                    $email = $this->connection->email ?? 'connected@email.com';
                }
            }

            return [
                'access_token' => $token['access_token'],
                'refresh_token' => $token['refresh_token'] ?? $this->connection->refresh_token,
                'id_token' => $token['id_token'] ?? null,
                'token_expires_at' => isset($token['expires_in']) 
                    ? now()->addSeconds($token['expires_in']) 
                    : null,
                'email' => $email,
                'token_metadata' => $token,
            ];
        } catch (\Exception $e) {
            Log::error('Gmail OAuth callback error: ' . $e->getMessage());
            Log::error('Gmail OAuth callback error trace: ' . $e->getTraceAsString());
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

            $this->client->refreshToken($this->connection->refresh_token);
            $token = $this->client->getAccessToken();

            $this->connection->update([
                'access_token' => $token['access_token'],
                'token_expires_at' => isset($token['expires_in']) 
                    ? now()->addSeconds($token['expires_in']) 
                    : null,
                'token_metadata' => $token,
            ]);

            return true;
        } catch (\Exception $e) {
            Log::error('Gmail token refresh error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Get contacts from Gmail
     */
    public function getContacts(): array
    {
        $contacts = [];
        
        try {
            // Ensure token is valid
            if ($this->connection->isTokenExpired()) {
                $this->refreshToken();
            }

            // Try to get contacts from People API
            try {
                $peopleService = new Google_Service_PeopleService($this->client);
                $pageToken = null;

                do {
                    $results = $peopleService->people_connections->listPeopleConnections(
                        'people/me',
                        [
                            'personFields' => 'names,emailAddresses',
                            'pageSize' => 100,
                            'pageToken' => $pageToken,
                        ]
                    );

                    foreach ($results->getConnections() as $person) {
                        $names = $person->getNames();
                        $emails = $person->getEmailAddresses();

                        if ($emails && count($emails) > 0) {
                            $name = $names && count($names) > 0 ? $names[0]->getDisplayName() : null;
                            $email = $emails[0]->getValue();

                            if ($email) {
                                $contacts[] = [
                                    'email' => $email,
                                    'name' => $name,
                                    'provider_contact_id' => $person->getResourceName(),
                                    'metadata' => [
                                        'resource_name' => $person->getResourceName(),
                                    ],
                                ];
                            }
                        }
                    }

                    $pageToken = $results->getNextPageToken();
                } while ($pageToken);
            } catch (\Exception $e) {
                // People API might not be enabled - log warning but continue
                Log::warning('Gmail People API not available: ' . $e->getMessage());
                Log::info('Will attempt to get contacts from recent senders instead');
            }

            return $contacts;
        } catch (\Exception $e) {
            Log::error('Gmail get contacts error: ' . $e->getMessage());
            // Return empty array instead of throwing - we can still get contacts from recent senders
            return $contacts;
        }
    }

    /**
     * Get recent senders from Gmail
     * Fetches all messages by paginating through results
     */
    public function getRecentSenders(int $limit = 1000): array
    {
        try {
            // Ensure token is valid
            if ($this->connection->isTokenExpired()) {
                $this->refreshToken();
            }

            $gmailService = new Google_Service_Gmail($this->client);
            $senders = [];
            $seenEmails = [];
            $pageToken = null;
            $maxResults = 500; // Gmail API max per page
            $totalFetched = 0;

            do {
                $params = [
                    'maxResults' => min($maxResults, $limit - $totalFetched),
                ];
                
                if ($pageToken) {
                    $params['pageToken'] = $pageToken;
                }

                $messagesResponse = $gmailService->users_messages->listUsersMessages('me', $params);
                $messages = $messagesResponse->getMessages() ?? [];

                foreach ($messages as $message) {
                    try {
                        $msg = $gmailService->users_messages->get('me', $message->getId(), ['format' => 'metadata']);
                        $headers = $msg->getPayload()->getHeaders();

                        $from = null;
                        $subject = null;
                        foreach ($headers as $header) {
                            if ($header->getName() === 'From') {
                                $from = $header->getValue();
                            }
                            if ($header->getName() === 'Subject') {
                                $subject = $header->getValue();
                            }
                        }

                        if ($from) {
                            // Extract email from "Name <email@example.com>" format
                            if (preg_match('/<(.+)>/', $from, $matches)) {
                                $email = $matches[1];
                            } else {
                                $email = trim($from);
                            }

                            // Extract name if available
                            $name = null;
                            if (preg_match('/^(.+)\s*<.+>$/', $from, $matches)) {
                                $name = trim($matches[1], '"\' ');
                            }

                            $emailLower = strtolower($email);
                            if ($email && !in_array($emailLower, $seenEmails) && filter_var($email, FILTER_VALIDATE_EMAIL)) {
                                $seenEmails[] = $emailLower;
                                $senders[] = [
                                    'email' => $email,
                                    'name' => $name,
                                    'provider_contact_id' => $message->getId(),
                                    'metadata' => [
                                        'subject' => $subject,
                                        'message_id' => $message->getId(),
                                    ],
                                ];
                            }
                        }
                    } catch (\Exception $e) {
                        // Skip individual message errors and continue
                        Log::warning('Error processing message ' . $message->getId() . ': ' . $e->getMessage());
                        continue;
                    }
                }

                $totalFetched += count($messages);
                $pageToken = $messagesResponse->getNextPageToken();
                
                // Stop if we've reached the limit or no more pages
                if ($totalFetched >= $limit || !$pageToken) {
                    break;
                }
            } while ($pageToken && $totalFetched < $limit);

            Log::info("Fetched {$totalFetched} messages, extracted " . count($senders) . " unique senders");
            return $senders;
        } catch (\Exception $e) {
            Log::error('Gmail get recent senders error: ' . $e->getMessage());
            throw $e;
        }
    }
}

