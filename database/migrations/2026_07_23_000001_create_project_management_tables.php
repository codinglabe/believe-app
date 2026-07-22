<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_boards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('background')->default('purple-blue');
            $table->boolean('is_starred')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['organization_id', 'archived_at']);
        });

        Schema::create('project_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('project_boards')->cascadeOnDelete();
            $table->string('name');
            $table->unsignedInteger('position')->default(0);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['board_id', 'position']);
        });

        Schema::create('project_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('project_boards')->cascadeOnDelete();
            $table->foreignId('list_id')->constrained('project_lists')->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->timestamp('due_at')->nullable();
            $table->string('cover_color', 32)->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->index(['list_id', 'position']);
            $table->index(['board_id', 'archived_at']);
        });

        Schema::create('project_labels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('project_boards')->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 32)->default('purple');
            $table->timestamps();
        });

        Schema::create('project_card_label', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('project_cards')->cascadeOnDelete();
            $table->foreignId('label_id')->constrained('project_labels')->cascadeOnDelete();
            $table->unique(['card_id', 'label_id']);
        });

        Schema::create('project_card_member', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('project_cards')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unique(['card_id', 'user_id']);
        });

        Schema::create('project_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('project_cards')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('project_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_id')->constrained('project_checklists')->cascadeOnDelete();
            $table->string('title');
            $table->boolean('is_complete')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->timestamps();
        });

        Schema::create('project_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('project_cards')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });

        Schema::create('project_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('card_id')->constrained('project_cards')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 127)->nullable();
            $table->unsignedBigInteger('size')->default(0);
            $table->timestamps();
        });

        Schema::create('project_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_id')->constrained('project_boards')->cascadeOnDelete();
            $table->foreignId('card_id')->nullable()->constrained('project_cards')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['board_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_activities');
        Schema::dropIfExists('project_attachments');
        Schema::dropIfExists('project_comments');
        Schema::dropIfExists('project_checklist_items');
        Schema::dropIfExists('project_checklists');
        Schema::dropIfExists('project_card_member');
        Schema::dropIfExists('project_card_label');
        Schema::dropIfExists('project_labels');
        Schema::dropIfExists('project_cards');
        Schema::dropIfExists('project_lists');
        Schema::dropIfExists('project_boards');
    }
};
