<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Users with clinic_id become clinic_owner (they were clinic-level admins)
        DB::table('users')
            ->where('role', 'admin')
            ->whereNotNull('clinic_id')
            ->update(['role' => 'clinic_owner']);

        // Users without clinic_id become super_admin (platform owner)
        DB::table('users')
            ->where('role', 'admin')
            ->whereNull('clinic_id')
            ->update(['role' => 'super_admin']);
    }

    public function down(): void
    {
        DB::table('users')
            ->whereIn('role', ['clinic_owner', 'super_admin'])
            ->update(['role' => 'admin']);
    }
};
