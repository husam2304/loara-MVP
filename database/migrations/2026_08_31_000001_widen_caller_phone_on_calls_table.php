<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Widen calls.caller_phone from varchar(20) to varchar(50).
     *
     * The original column (see 2025_03_05_000007_create_calls_table.php)
     * was defined as `$table->string('caller_phone', 20)`, which is too
     * narrow for some real-world caller ID formats (e.g. international
     * numbers with country codes, extensions, or provider-prefixed
     * values coming from Vapi). Schema::table()->change() is Laravel's
     * portable schema API and works against both SQLite and MySQL, so it
     * is used here instead of raw, database-specific SQL.
     */
    public function up(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->string('caller_phone', 50)->change();
        });
    }

    public function down(): void
    {
        Schema::table('calls', function (Blueprint $table) {
            $table->string('caller_phone', 20)->change();
        });
    }
};
