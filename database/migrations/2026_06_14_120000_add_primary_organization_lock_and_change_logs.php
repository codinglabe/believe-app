<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'primary_organization_locked')) {
            Schema::table('users', function (Blueprint $table) {
                $table->boolean('primary_organization_locked')->default(false)->after('primary_organization_id');
            });
        }

        if (! Schema::hasTable('supporter_primary_organization_changes')) {
            Schema::create('supporter_primary_organization_changes', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->unsignedBigInteger('previous_organization_id')->nullable();
                $table->unsignedBigInteger('new_organization_id')->nullable();
                $table->unsignedBigInteger('notified_organization_id')->nullable();
                $table->text('reason');
                $table->timestamps();

                $table->foreign('user_id', 'spoc_user_fk')
                    ->references('id')->on('users')->cascadeOnDelete();
                $table->foreign('previous_organization_id', 'spoc_prev_org_fk')
                    ->references('id')->on('organizations')->nullOnDelete();
                $table->foreign('new_organization_id', 'spoc_new_org_fk')
                    ->references('id')->on('organizations')->nullOnDelete();
                $table->foreign('notified_organization_id', 'spoc_notified_org_fk')
                    ->references('id')->on('organizations')->nullOnDelete();

                $table->index(['notified_organization_id', 'created_at'], 'spoc_notified_org_created_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('supporter_primary_organization_changes');

        if (Schema::hasColumn('users', 'primary_organization_locked')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('primary_organization_locked');
            });
        }
    }
};
