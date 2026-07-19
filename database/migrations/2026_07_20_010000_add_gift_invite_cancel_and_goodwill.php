<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('believe_point_gift_invites', function (Blueprint $table) {
            if (! Schema::hasColumn('believe_point_gift_invites', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('refunded_at');
            }
            if (! Schema::hasColumn('believe_point_gift_invites', 'last_resent_at')) {
                $table->timestamp('last_resent_at')->nullable()->after('cancelled_at');
            }
        });

        if (! Schema::hasTable('believe_point_gift_invite_goodwills')) {
            Schema::create('believe_point_gift_invite_goodwills', function (Blueprint $table) {
                $table->id();
                $table->foreignId('invite_id')
                    ->nullable()
                    ->constrained('believe_point_gift_invites')
                    ->nullOnDelete();
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->string('email');
                $table->string('sender_name')->nullable();
                $table->decimal('brp_amount', 10, 2)->default(10);
                $table->string('reason', 32)->default('cancelled'); // cancelled|email_changed
                $table->timestamp('awarded_at')->nullable();
                $table->unsignedBigInteger('awarded_user_id')->nullable();
                $table->timestamps();

                $table->foreign('awarded_user_id', 'bp_gift_goodwill_user_fk')
                    ->references('id')->on('users')->nullOnDelete();

                $table->index(['email', 'awarded_at'], 'bp_gift_goodwill_email_awarded_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('believe_point_gift_invite_goodwills');

        Schema::table('believe_point_gift_invites', function (Blueprint $table) {
            if (Schema::hasColumn('believe_point_gift_invites', 'last_resent_at')) {
                $table->dropColumn('last_resent_at');
            }
            if (Schema::hasColumn('believe_point_gift_invites', 'cancelled_at')) {
                $table->dropColumn('cancelled_at');
            }
        });
    }
};
