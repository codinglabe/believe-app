<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiService
{
    protected $apiKey;
    protected $apiUrl = 'https://api.openai.com/v1/chat/completions';

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    public function generateContent(string $prompt, int $count, string $type): array
    {
        $systemPrompt = $this->buildSystemPrompt($type, $count);

        try {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $this->apiKey,
                'Content-Type' => 'application/json',
            ])
                ->timeout(120)
                ->connectTimeout(30)
                ->post($this->apiUrl, [
                    'model' => 'gpt-4o-mini',
                    'messages' => [
                        [
                            'role' => 'system',
                            'content' => $systemPrompt,
                        ],
                        [
                            'role' => 'user',
                            'content' => $prompt,
                        ],
                    ],
                    'temperature' => 0.7,
                    'max_tokens' => 4000,
                    'top_p' => 0.9,
                ]);

            if ($response->failed()) {
                $errorBody = $response->body();
                Log::error('OpenAI API Error', [
                    'status' => $response->status(),
                    'body' => $errorBody,
                    'prompt' => substr($prompt, 0, 100),
                ]);
                throw new \Exception('OpenAI API Error: ' . $response->status() . ' - ' . $errorBody);
            }

            $content = $response->json('choices.0.message.content');

            if (empty($content)) {
                throw new \Exception('Empty response from OpenAI');
            }

            $parsed = $this->parseContent($content);

            if (count($parsed) < $count) {
                Log::warning('Fewer items generated than requested', [
                    'requested' => $count,
                    'generated' => count($parsed),
                ]);
            }

            return $parsed;
        } catch (\Exception $e) {
            Log::error('OpenAI Service Error', [
                'message' => $e->getMessage(),
                'prompt' => substr($prompt, 0, 100),
            ]);
            throw $e;
        }
    }

    protected function buildSystemPrompt(string $type, int $count): string
    {
        return <<<PROMPT
You are a spiritual content creator specializing in Christian prayers and devotions. Generate exactly {$count} unique {$type} items.

CRITICAL: Return ONLY a valid JSON array with exactly {$count} items. No markdown, no code blocks, no extra text whatsoever.

Return this exact structure:
[
  {
    "title": "Short, meaningful title (max 100 chars)",
    "body": "Prayer or devotional content as plain text. Make it personal, heartfelt, and inspiring. 50-150 words.",
    "scripture_ref": "Bible verse reference if applicable (e.g., 'John 3:16')",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

IMPORTANT RULES:
- Generate EXACTLY {$count} items - no more, no less
- Write in first person as if someone is praying
- Keep content personal and relatable
- Include relevant Bible verses naturally
- Make content inspiring and theologically sound
- Use plain text, no HTML tags
- Each item must be unique and meaningful
- Focus on one main theme per item
- Return ONLY valid JSON array, no other text whatsoever
- Do not include any markdown formatting
- Do not include any code blocks
- Do not include any explanatory text before or after the JSON

Example for 2 items:
[
  {
    "title": "Prayer for Peace in Difficult Times",
    "body": "Heavenly Father, in the midst of my struggles, I come to You seeking peace. Your Word says in Philippians 4:7 that Your peace surpasses all understanding. Guard my heart and mind today, and help me to trust in Your perfect plan. Calm my anxious thoughts and fill me with Your tranquility.",
    "scripture_ref": "Philippians 4:7",
    "tags": ["peace", "anxiety", "trust"]
  },
  {
    "title": "Prayer for Strength and Courage",
    "body": "Lord, I need Your strength today. When I feel weak and afraid, remind me that You are with me always. Give me courage to face the challenges ahead and wisdom to make the right decisions. Help me to lean on You and trust in Your unfailing love.",
    "scripture_ref": "Joshua 1:9",
    "tags": ["strength", "courage", "faith"]
  }
]
PROMPT;
    }

    protected function parseContent(string $jsonContent): array
    {
        $cleanContent = trim($jsonContent);

        // Remove markdown code blocks if present
        $cleanContent = preg_replace('/^```json\s*/i', '', $cleanContent);
        $cleanContent = preg_replace('/\s*```$/i', '', $cleanContent);
        $cleanContent = preg_replace('/^```\s*/i', '', $cleanContent);
        $cleanContent = preg_replace('/\s*```$/i', '', $cleanContent);
        $cleanContent = trim($cleanContent);

        $jsonString = null;

        // Try to extract JSON array
        if (preg_match('/\[\s*\{[\s\S]*\}\s*\]/', $cleanContent, $matches)) {
            $jsonString = $matches[0];
        } else {
            Log::error('JSON extraction failed', [
                'content' => substr($cleanContent, 0, 500),
            ]);
            throw new \Exception('Could not extract JSON array from response');
        }

        // Decode JSON
        $parsed = json_decode($jsonString, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Log::error('JSON decode error', [
                'error' => json_last_error_msg(),
                'json' => substr($jsonString, 0, 500),
            ]);
            throw new \Exception('JSON parse error: ' . json_last_error_msg());
        }

        if (!is_array($parsed)) {
            throw new \Exception('Parsed content is not an array');
        }

        if (empty($parsed)) {
            throw new \Exception('Empty array returned from OpenAI');
        }

        $validatedItems = [];
        foreach ($parsed as $index => $item) {
            // Ensure required fields exist
            if (!isset($item['title']) || !isset($item['body'])) {
                Log::warning('Invalid item structure at index ' . $index, ['item' => $item]);
                continue;
            }

            // Ensure title and body are not empty
            $title = trim(strip_tags($item['title'] ?? ''));
            $body = trim(strip_tags($item['body'] ?? ''));

            if (empty($title) || empty($body)) {
                Log::warning('Empty title or body at index ' . $index);
                continue;
            }

            $validatedItems[] = [
                'title' => $title,
                'body' => $body,
                'scripture_ref' => trim(strip_tags($item['scripture_ref'] ?? '')),
                'tags' => is_array($item['tags'] ?? null) ? $item['tags'] : ['ai-generated'],
            ];
        }

        if (empty($validatedItems)) {
            throw new \Exception('No valid items found in OpenAI response');
        }

        return $validatedItems;
    }
}
