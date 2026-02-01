<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KnowledgeBaseController extends Controller
{
    protected string $staticPath = 'knowledge-base/static.txt';
    protected string $learnedPath = 'knowledge-base/learned.txt';

    /**
     * Ensure knowledge base files exist.
     */
    protected function ensureFilesExist(): void
    {
        $dir = 'knowledge-base';
        if (!Storage::exists($dir)) {
            Storage::makeDirectory($dir);
        }

        if (!Storage::exists($this->staticPath)) {
            Storage::put($this->staticPath, $this->getDefaultStaticContent());
        }

        if (!Storage::exists($this->learnedPath)) {
            Storage::put($this->learnedPath, "=== LEARNED KNOWLEDGE (USER PROVIDED) ===\nNo additional notes yet.\n");
        }
    }

    /**
     * Default static content (from resources/data/knowledge-base-static.txt).
     */
    protected function getDefaultStaticContent(): string
    {
        $path = resource_path('data/knowledge-base-static.txt');
        if (file_exists($path)) {
            return file_get_contents($path);
        }
        return "=== BELIEVEINUNITY.ORG ===\nNAME: BelieveInUnity.org\nMISSION: Building a world unified by purpose and compassion.\nEdit resources/data/knowledge-base-static.txt to add full knowledge base.\n";
    }

    /**
     * GET /api/knowledge-base - Returns full knowledge (static + learned).
     * Static content is read from resources/data/knowledge-base-static.txt when present,
     * so edits there are always reflected without touching storage.
     */
    public function index()
    {
        $this->ensureFilesExist();

        $resourceStatic = resource_path('data/knowledge-base-static.txt');
        $static = file_exists($resourceStatic)
            ? file_get_contents($resourceStatic)
            : Storage::get($this->staticPath);
        $learned = Storage::get($this->learnedPath);

        return response()->json([
            'success' => true,
            'knowledge' => trim($static) . "\n\n" . trim($learned),
        ]);
    }

    /**
     * POST /api/knowledge-base/learn - Append a new fact to learned knowledge.
     */
    public function learn(Request $request)
    {
        $request->validate([
            'newFact' => 'required|string|max:2000',
        ]);

        $this->ensureFilesExist();

        $fact = trim($request->input('newFact'));
        $timestamp = now()->format('Y-m-d');
        $line = "[{$timestamp}] {$fact}\n";

        $current = Storage::get($this->learnedPath);

        // If file only has header and "No additional notes yet", replace that line
        if (str_contains($current, 'No additional notes yet.')) {
            $current = str_replace(
                "No additional notes yet.\n",
                "No additional notes yet.\n\n{$line}",
                $current
            );
        } else {
            $current .= $line;
        }

        Storage::put($this->learnedPath, $current);

        return response()->json([
            'success' => true,
            'message' => 'Knowledge updated.',
        ]);
    }
}
