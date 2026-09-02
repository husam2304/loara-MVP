<?php

namespace Database\Factories;

use App\Models\SquadWorkflow;
use App\Models\WorkflowNode;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\WorkflowEdge>
 */
class WorkflowEdgeFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'squad_workflow_id' => SquadWorkflow::factory(),
            'source_node_id' => WorkflowNode::factory(),
            'target_node_id' => WorkflowNode::factory(),
            'condition' => 'When caller needs assistance',
            'description' => null,
            'context_plan' => 'all',
        ];
    }
}
