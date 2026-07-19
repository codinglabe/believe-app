<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'holding_believe_points')) {
                $table->decimal('holding_believe_points', 10, 2)
                    ->default(0)
                    ->after('gifted_believe_points');
            }
        });

        if (! Schema::hasTable('believe_point_gift_invites')) {
            Schema::create('believe_point_gift_invites', function (Blueprint $table) {
                $table->id();
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->string('recipient_email');
                $table->unsignedBigInteger('recipient_id')->nullable();
                $table->unsignedBigInteger('gift_occasion_id')->nullable();
                $table->decimal('amount', 10, 2);
                $table->string('occasion', 64)->nullable();
                $table->text('message')->nullable();
                $table->string('token', 64)->unique();
                $table->string('status', 32)->default('pending'); // pending|claimed|expired|cancelled
                $table->timestamp('expires_at');
                $table->timestamp('claimed_at')->nullable();
                $table->timestamp('refunded_at')->nullable();
                $table->unsignedBigInteger('supporter_believe_point_gift_id')->nullable();
                $table->timestamps();

                $table->foreign('recipient_id', 'bp_gift_invites_recipient_fk')
                    ->references('id')->on('users')->nullOnDelete();
                $table->foreign('gift_occasion_id', 'bp_gift_invites_occasion_fk')
                    ->references('id')->on('gift_occasions')->nullOnDelete();
                $table->foreign('supporter_believe_point_gift_id', 'bp_gift_invites_gift_fk')
                    ->references('id')->on('supporter_believe_point_gifts')->nullOnDelete();

                $table->index(['recipient_email', 'status'], 'bp_gift_invites_email_status_idx');
                $table->index(['sender_id', 'status'], 'bp_gift_invites_sender_status_idx');
                $table->index(['status', 'expires_at'], 'bp_gift_invites_status_expires_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('believe_point_gift_invites');

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'holding_believe_points')) {
                $table->dropColumn('holding_believe_points');
            }
        });
    }
};
