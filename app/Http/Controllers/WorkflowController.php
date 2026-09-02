<?php

namespace App\Http\Controllers;

use App\Enums\CallToolName;
use App\Http\Requests\StoreWorkflowEdgeRequest;
use App\Http\Requests\StoreWorkflowNodeRequest;
use App\Http\Requests\StoreWorkflowRequest;
use App\Http\Requests\UpdateWorkflowEdgeRequest;
use App\Http\Requests\UpdateWorkflowNodeRequest;
use App\Models\AiConfiguration;
use App\Models\SquadWorkflow;
use App\Models\WorkflowEdge;
use App\Models\WorkflowNode;
use App\Services\VapiService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class WorkflowController extends Controller
{
    public function index(): Response
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic) {
            $availableTools = array_map(
                fn (CallToolName $case) => [
                    'value' => $case->value,
                    'label' => str_replace('_', ' ', ucfirst($case->value)),
                ],
                CallToolName::cases(),
            );

            return Inertia::render('Workflow', [
                'workflow' => null,
                'availableTools' => $availableTools,
            ]);
        }

        $workflow = SquadWorkflow::query()
            ->where('clinic_id', $clinic->id)
            ->with(['nodes', 'edges.sourceNode', 'edges.targetNode'])
            ->first();

        $availableTools = array_map(
            fn (CallToolName $case) => [
                'value' => $case->value,
                'label' => str_replace('_', ' ', ucfirst($case->value)),
            ],
            CallToolName::cases(),
        );

        return Inertia::render('Workflow', [
            'workflow' => $workflow,
            'availableTools' => $availableTools,
        ]);
    }

    public function store(StoreWorkflowRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        $workflow = SquadWorkflow::create([
            'clinic_id' => $clinic->id,
            'name' => $request->validated('name'),
            'description' => $request->validated('description'),
            'is_active' => false,
        ]);

        $allToolNames = array_column(CallToolName::cases(), 'value');
        $aiConfig = AiConfiguration::where('clinic_id', $clinic->id)->first();

        $nodeData = [
            'squad_workflow_id' => $workflow->id,
            'is_entry_point' => true,
            'sort_order' => 0,
            'tool_names' => $allToolNames,
        ];

        if ($aiConfig) {
            $nodeData = array_merge($nodeData, [
                'name' => 'Front Desk',
                'system_prompt' => $aiConfig->system_prompt,
                'greeting_message' => $aiConfig->greeting_message,
                'model' => $aiConfig->model ?? 'gpt-4o',
                'temperature' => $aiConfig->temperature ?? 0.7,
                'voice_provider' => $aiConfig->voice_provider ?? 'vapi',
                'voice_name' => $aiConfig->voice_name ?? 'jessica',
            ]);
        } else {
            $nodeData = array_merge($nodeData, [
                'name' => 'Front Desk',
                'model' => 'gpt-4o',
                'temperature' => 0.7,
                'voice_provider' => 'vapi',
                'voice_name' => 'jessica',
            ]);
        }

        WorkflowNode::create($nodeData);

        return back()->with('success', 'Workflow created with entry point node.');
    }

    public function storeNode(StoreWorkflowNodeRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        $workflow = SquadWorkflow::where('clinic_id', $clinic->id)->firstOrFail();

        $maxSortOrder = $workflow->nodes()->max('sort_order') ?? 0;

        $workflow->nodes()->create(array_merge($request->validated(), [
            'is_entry_point' => false,
            'sort_order' => $maxSortOrder + 1,
        ]));

        return back()->with('success', 'Assistant node added.');
    }

    public function updateNode(UpdateWorkflowNodeRequest $request, WorkflowNode $workflowNode): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $workflowNode->squadWorkflow->clinic_id !== $clinic->id) {
            abort(403);
        }

        $workflowNode->update($request->validated());

        $workflowNode->squadWorkflow->touch();

        return back()->with('success', 'Node updated.');
    }

    public function destroyNode(WorkflowNode $workflowNode): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $workflowNode->squadWorkflow->clinic_id !== $clinic->id) {
            abort(403);
        }

        if ($workflowNode->is_entry_point) {
            return back()->withErrors(['node' => 'Cannot delete the entry point node.']);
        }

        $workflow = $workflowNode->squadWorkflow;

        $workflowNode->delete();

        $workflow->touch();

        return back()->with('success', 'Node removed.');
    }

    public function setEntryPoint(WorkflowNode $workflowNode): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $workflowNode->squadWorkflow->clinic_id !== $clinic->id) {
            abort(403);
        }

        WorkflowNode::query()
            ->where('squad_workflow_id', $workflowNode->squad_workflow_id)
            ->update(['is_entry_point' => false]);

        $workflowNode->update(['is_entry_point' => true]);

        $workflowNode->squadWorkflow->touch();

        return back()->with('success', 'Entry point updated.');
    }

    public function storeEdge(StoreWorkflowEdgeRequest $request): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        $workflow = SquadWorkflow::where('clinic_id', $clinic->id)->firstOrFail();

        $maxSortOrder = $workflow->edges()->max('sort_order') ?? 0;

        $workflow->edges()->create(array_merge($request->validated(), [
            'sort_order' => $maxSortOrder + 1,
        ]));

        $workflow->touch();

        return back()->with('success', 'Transition added.');
    }

    public function updateEdge(UpdateWorkflowEdgeRequest $request, WorkflowEdge $workflowEdge): RedirectResponse
    {
        $clinic = $request->user()->clinic;

        if (! $clinic || $workflowEdge->squadWorkflow->clinic_id !== $clinic->id) {
            abort(403);
        }

        $workflowEdge->update($request->validated());

        $workflowEdge->squadWorkflow->touch();

        return back()->with('success', 'Transition updated.');
    }

    public function destroyEdge(WorkflowEdge $workflowEdge): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        if (! $clinic || $workflowEdge->squadWorkflow->clinic_id !== $clinic->id) {
            abort(403);
        }

        $workflow = $workflowEdge->squadWorkflow;

        $workflowEdge->delete();

        $workflow->touch();

        return back()->with('success', 'Transition removed.');
    }

    public function deploy(): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        $workflow = SquadWorkflow::query()
            ->where('clinic_id', $clinic->id)
            ->with(['nodes.outgoingEdges.targetNode', 'edges'])
            ->first();

        if (! $workflow) {
            return back()->withErrors(['deploy' => 'No workflow found. Create a workflow first.']);
        }

        if ($workflow->nodes->count() < 2) {
            return back()->withErrors(['deploy' => 'Squad mode requires at least 2 assistant nodes.']);
        }

        $entryNodes = $workflow->nodes->where('is_entry_point', true);

        if ($entryNodes->count() !== 1) {
            return back()->withErrors(['deploy' => 'Workflow must have exactly one entry point node.']);
        }

        $entryNode = $entryNodes->first();

        if ($entryNode->outgoingEdges->isEmpty()) {
            return back()->withErrors(['deploy' => 'Entry point node must have at least one outgoing transition.']);
        }

        if (empty(config('vapi.private_key'))) {
            return back()->withErrors(['deploy' => 'VAPI_PRIVATE_KEY is not configured. Add it to your .env file.']);
        }

        $config = AiConfiguration::where('clinic_id', $clinic->id)->first();

        if (! $config || empty($config->vapi_function_tool_ids)) {
            return back()->withErrors(['deploy' => 'Please save your AI Assistant configuration first to sync function tools.']);
        }

        try {
            $vapi = app(VapiService::class);

            $allToolIds = $config->vapi_function_tool_ids ?? [];

            $toolDefs = $vapi->buildFunctionToolDefinitions(config('vapi.webhook_url'));

            // vapi_function_tool_ids is stored positionally aligned to the
            // buildFunctionToolDefinitions() order. If the tool set changed since the
            // clinic last saved its AI config, that alignment is stale — refuse to deploy
            // rather than silently wiring squad members to the wrong Vapi tool ids.
            if (count($allToolIds) !== count($toolDefs)) {
                return back()->withErrors(['deploy' => 'Your saved AI tools are out of date. Open Settings → AI Assistant and save to re-sync your tools, then deploy again.']);
            }

            $toolNameToIdMap = [];
            foreach ($toolDefs as $i => $def) {
                $name = $def['function']['name'];
                if (isset($allToolIds[$i])) {
                    $toolNameToIdMap[$name] = $allToolIds[$i];
                }
            }

            $otherNodes = $workflow->nodes->where('id', '!=', $entryNode->id);
            $allNodes = collect([$entryNode])->merge($otherNodes);

            $members = [];
            foreach ($allNodes as $node) {
                $assistantPayload = $vapi->buildSquadMemberPayload($node, $allToolIds, $toolNameToIdMap, $clinic->name);

                if ($node->vapi_assistant_id) {
                    $assistant = $vapi->updateAssistant($node->vapi_assistant_id, $assistantPayload);
                } else {
                    $assistant = $vapi->createAssistant($assistantPayload);
                }

                $node->update(['vapi_assistant_id' => $assistant['id']]);

                $destinations = $node->outgoingEdges->map(fn (WorkflowEdge $edge) => [
                    'type' => 'assistant',
                    'assistantName' => $edge->targetNode->name,
                    'message' => $edge->description ?? "I'm transferring you now.",
                    'description' => $edge->condition,
                ])->toArray();

                $members[] = [
                    'assistantId' => $assistant['id'],
                    'assistantDestinations' => $destinations,
                ];
            }

            $squadPayload = [
                'name' => $workflow->name,
                'members' => $members,
            ];

            if ($workflow->vapi_squad_id) {
                $squad = $vapi->updateSquad($workflow->vapi_squad_id, $squadPayload);
            } else {
                $squad = $vapi->createSquad($squadPayload);
                $workflow->vapi_squad_id = $squad['id'];
            }

            $workflow->update([
                'vapi_squad_id' => $workflow->vapi_squad_id,
                'is_active' => true,
                'deployed_at' => now(),
            ]);

            Log::info('Squad deployed successfully with assistants', [
                'squad_id' => $workflow->vapi_squad_id,
                'clinic_id' => $clinic->id,
                'assistant_ids' => $allNodes->mapWithKeys(fn ($node) => [$node->name => $node->vapi_assistant_id])->all(),
            ]);

            $config->update([
                'vapi_squad_id' => $workflow->vapi_squad_id,
                'workflow_mode' => 'squad',
            ]);

            return back()->with('success', 'Workflow deployed successfully.');
        } catch (RequestException $e) {
            $body = $e->response?->json() ?? [];
            $errorMsg = $body['message'] ?? $body['error'] ?? 'Failed to deploy squad to Vapi.';

            Log::error('Vapi squad deploy failed', [
                'status' => $e->response?->status(),
                'body' => $body,
            ]);

            return back()->withErrors(['deploy' => $errorMsg]);
        } catch (\Throwable $e) {
            Log::error('Workflow deploy failed', ['error' => $e->getMessage()]);

            return back()->withErrors(['deploy' => 'Deployment failed: '.$e->getMessage()]);
        }
    }

    public function undeploy(): RedirectResponse
    {
        $clinic = auth()->user()->clinic;

        $workflow = SquadWorkflow::where('clinic_id', $clinic->id)->first();
        $config = AiConfiguration::where('clinic_id', $clinic->id)->first();

        if ($workflow?->vapi_squad_id) {
            try {
                $vapi = app(VapiService::class);
                $vapi->deleteSquad($workflow->vapi_squad_id);
            } catch (\Throwable $e) {
                Log::warning('Failed to delete Vapi squad during undeploy', [
                    'squad_id' => $workflow->vapi_squad_id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        if ($workflow) {
            $workflow->update([
                'is_active' => false,
                'vapi_squad_id' => null,
                'deployed_at' => null,
            ]);
        }

        if ($config) {
            $config->update([
                'workflow_mode' => 'single',
                'vapi_squad_id' => null,
            ]);
        }

        return back()->with('success', 'Squad mode disabled. Reverted to single assistant.');
    }
}
