<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('insurance_claims', function (Blueprint $table) {
            $table->string('claim_md_id')->nullable()->after('notes');
            $table->string('payer_claim_id')->nullable()->after('claim_md_id');
            $table->string('claim_md_status')->nullable()->after('payer_claim_id');
            $table->decimal('paid_amount', 10, 2)->nullable()->after('claim_md_status');
            $table->json('claim_md_response')->nullable()->after('paid_amount');
            $table->timestamp('submitted_to_payer_at')->nullable()->after('claim_md_response');

            $table->index('claim_md_id');
        });
    }

    public function down(): void
    {
        Schema::table('insurance_claims', function (Blueprint $table) {
            $table->dropIndex(['claim_md_id']);
            $table->dropColumn([
                'claim_md_id',
                'payer_claim_id',
                'claim_md_status',
                'paid_amount',
                'claim_md_response',
                'submitted_to_payer_at',
            ]);
        });
    }
};
