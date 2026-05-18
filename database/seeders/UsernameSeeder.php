<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UsernameSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::all();

        foreach ($user as $u) {
            if (empty($u->slug)) {
                if($u->role === 'organization') {
                    $slug = Str::slug($u->organization->name);
                } else {
                    $slug = Str::slug($u->name . ' ' . $u->id);
                }
                if (User::where('slug', $slug)->exists()) {
                    $slug = $slug . '-' . Str::random(5);
                }
                $u->update(['slug' => $slug]);
            }
        }
    }
}
