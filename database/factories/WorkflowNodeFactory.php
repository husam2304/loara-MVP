<?php

namespace Database\Factories;

use App\Models\SquadWorkflow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkflowNode>
 */
class WorkflowNodeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'squad_workflow_id' => SquadWorkflow::factory(),
            'name' => fake()->words(2, true),
            'role' => 'receptionist',
            'model' => 'gpt-4o',
            'temperature' => 0.7,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'tool_names' => ['lookup_patient', 'check_schedule'],
            'is_entry_point' => false,
        ];
    }

    public function entryPoint(): static
    {
        return $this->state(fn () => ['is_entry_point' => true]);
    }
}
