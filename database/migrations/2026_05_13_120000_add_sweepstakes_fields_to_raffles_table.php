<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            $table->string('sweepstakes_type', 32)->nullable()->after('winners_count');
            $table->boolean('npn_entry_enabled')->default(false)->after('sweepstakes_type');
            $table->boolean('entry_free_online_enabled')->default(false)->after('npn_entry_enabled');
            $table->boolean('entry_donation_enabled')->default(true)->after('entry_free_online_enabled');
            $table->boolean('entry_mail_in_enabled')->default(false)->after('entry_donation_enabled');
            $table->boolean('entry_social_bonus_enabled')->default(false)->after('entry_mail_in_enabled');
            $table->boolean('entry_volunteer_enabled')->default(false)->after('entry_social_bonus_enabled');
            $table->longText('official_rules')->nullable()->after('entry_volunteer_enabled');
            $table->text('eligibility_rules')->nullable()->after('official_rules');
            $table->unsignedInteger('max_entries_per_person')->nullable()->after('eligibility_rules');
            $table->unsignedInteger('max_free_entries')->nullable()->after('max_entries_per_person');
            $table->unsignedInteger('max_donation_entries')->nullable()->after('max_free_entries');
            $table->unsignedTinyInteger('minimum_age')->nullable()->after('max_donation_entries');
            $table->json('country_restrictions')->nullable()->after('minimum_age');
            $table->json('state_restrictions')->nullable()->after('country_restrictions');
            $table->timestamp('winner_selected_at')->nullable()->after('state_restrictions');
            $table->foreignId('winner_selected_by_user_id')->nullable()->after('winner_selected_at')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('raffles', function (Blueprint $table) {
            $table->dropForeign(['winner_selected_by_user_id']);
            $table->dropColumn([
                'sweepstakes_type',
                'npn_entry_enabled',
                'entry_free_online_enabled',
                'entry_donation_enabled',
                'entry_mail_in_enabled',
                'entry_social_bonus_enabled',
                'entry_volunteer_enabled',
                'official_rules',
                'eligibility_rules',
                'max_entries_per_person',
                'max_free_entries',
                'max_donation_entries',
                'minimum_age',
                'country_restrictions',
                'state_restrictions',
                'winner_selected_at',
                'winner_selected_by_user_id',
            ]);
        });
    }
};
