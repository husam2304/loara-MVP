<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class WidenFileUrlOnCallRecordingsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * Widen `file_url` from its current varchar(255) to TEXT.
     *
     * Vapi's presigned recording URLs (artifact.presignedMonoUrl etc.)
     * are longer than the plain recordingUrl this table was originally
     * sized for - the host now includes a bucket subdomain and the
     * query string carries the full SigV4 signature params, pushing
     * some URLs past 500 characters. Storing them was previously
     * failing with:
     *   SQLSTATE[22001]: String data, right truncated:
     *   1406 Data too long for column 'file_url'
     */
    public function up(): void
    {
        Schema::table('call_recordings', function (Blueprint $table) {
            $table->text('file_url')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('call_recordings', function (Blueprint $table) {
            $table->string('file_url', 255)->nullable()->change();
        });
    }
}
