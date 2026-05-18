<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up()
    {
        Schema::create('board_member_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('board_member_id')->constrained()->onDelete('cascade');
            $table->string('action'); // appointed, resigned, status_changed
            $table->text('details')->nullable();
            $table->foreignId('changed_by')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('board_member_histories');
    }
};
