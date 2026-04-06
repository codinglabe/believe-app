<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateActivityLogTable extends Migration
{
    public function up()
    {
        $connection = config('activitylog.database_connection') ?: config('database.default');
        $tableName = config('activitylog.table_name') ?: 'activity_log';
        
        Schema::connection($connection)->create($tableName, function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('log_name')->nullable();
            $table->text('description');
            $table->nullableMorphs('subject', 'subject');
            $table->nullableMorphs('causer', 'causer');
            $table->json('properties')->nullable();
            $table->timestamps();
            $table->index('log_name');
        });
    }

    public function down()
    {
        $connection = config('activitylog.database_connection') ?: config('database.default');
        $tableName = config('activitylog.table_name') ?: 'activity_log';
        
        Schema::connection($connection)->dropIfExists($tableName);
    }
}
