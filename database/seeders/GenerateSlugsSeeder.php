<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Organization;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class GenerateSlugsSeeder extends Seeder
{
    /**
     * Generate a unique slug by appending incremental numbers
     */
    private function generateUniqueSlug(string $baseSlug, callable $existsCallback): string
    {
        $slug = $baseSlug;
        $counter = 1;

        while ($existsCallback($slug)) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        return $slug;
    }

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Starting slug generation for users and organizations...');

        // Process all users
        $users = User::all();
        $userCount = 0;
        $orgUserCount = 0;
        $updatedCount = 0;

        foreach ($users as $user) {
            // Regenerate slug for all users (even if they already have one)
            $slug = '';
            $currentUserId = $user->id;

            // For organization users, use organization name
            if ($user->role === 'organization' || $user->role === 'organization_pending') {
                $organization = Organization::where('user_id', $user->id)->first();
                if ($organization && !empty($organization->name)) {
                    $baseSlug = Str::slug($organization->name);
                    $slug = $this->generateUniqueSlug($baseSlug, function ($checkSlug) use ($currentUserId) {
                        // Exclude current user's slug when checking for uniqueness
                        return User::where('slug', $checkSlug)
                            ->where('id', '!=', $currentUserId)
                            ->exists();
                    });
                    $orgUserCount++;
                } else {
                    // Fallback to user name if organization not found
                    $baseSlug = Str::slug($user->name);
                    $slug = $this->generateUniqueSlug($baseSlug, function ($checkSlug) use ($currentUserId) {
                        return User::where('slug', $checkSlug)
                            ->where('id', '!=', $currentUserId)
                            ->exists();
                    });
                }
            } else {
                // For regular users, use name
                if (!empty($user->name)) {
                    $baseSlug = Str::slug($user->name);
                    $slug = $this->generateUniqueSlug($baseSlug, function ($checkSlug) use ($currentUserId) {
                        return User::where('slug', $checkSlug)
                            ->where('id', '!=', $currentUserId)
                            ->exists();
                    });
                    $userCount++;
                }
            }

            if (!empty($slug)) {
                $user->update(['slug' => $slug]);
                $updatedCount++;
                $this->command->info("Generated slug for user ID {$user->id}: {$slug}");
            }
        }

        $this->command->info("✓ Generated slugs for {$userCount} regular users");
        $this->command->info("✓ Generated slugs for {$orgUserCount} organization users");
        $this->command->info("✓ Updated {$updatedCount} user slugs");
        $this->command->info('Slug generation completed!');
    }
}
