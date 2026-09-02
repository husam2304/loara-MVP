<?php

namespace App\Http\Requests;

use App\Models\SquadWorkflow;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkflowEdgeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Scope node existence to the caller's own workflow so edges cannot
        // reference another clinic's nodes (cross-tenant IDOR). A null workflow
        // id matches nothing, failing the rule closed.
        $workflowId = SquadWorkflow::where('clinic_id', $this->user()?->clinic?->id)->value('id');

        return [
            'source_node_id' => ['required', Rule::exists('workflow_nodes', 'id')->where('squad_workflow_id', $workflowId)],
            'target_node_id' => ['required', Rule::exists('workflow_nodes', 'id')->where('squad_workflow_id', $workflowId), 'different:source_node_id'],
            'condition' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'context_plan' => ['required', 'string', Rule::in(['all', 'lastNMessages', 'none'])],
        ];
    }
}
