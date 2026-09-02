<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('squad_workflows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('clinic_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('name', 100)->default('Call Workflow');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(false);
            $table->string('vapi_squad_id')->nullable();
            $table->timestamp('deployed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('workflow_nodes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('squad_workflow_id')->constrained()->cascadeOnDelete();
            $table->string('name', 80);
            $table->string('role', 30)->nullable();
            $table->text('system_prompt')->nullable();
            $table->text('greeting_message')->nullable();
            $table->string('model', 50)->default('gpt-4o');
            $table->decimal('temperature', 2, 1)->default(0.7);
            $table->string('voice_provider', 30)->default('vapi');
            $table->string('voice_name', 50)->default('Elliot');
            $table->json('tool_names')->nullable();
            $table->boolean('is_entry_point')->default(false);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('vapi_assistant_id')->nullable();
            $table->timestamps();
        });

        Schema::create('workflow_edges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('squad_workflow_id')->constrained()->cascadeOnDelete();
            $table->foreignId('source_node_id')->constrained('workflow_nodes')->cascadeOnDelete();
            $table->foreignId('target_node_id')->constrained('workflow_nodes')->cascadeOnDelete();
            $table->string('condition');
            $table->text('description')->nullable();
            $table->string('context_plan', 30)->default('all');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['source_node_id', 'target_node_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('workflow_edges');
        Schema::dropIfExists('workflow_nodes');
        Schema::dropIfExists('squad_workflows');
    }
};
