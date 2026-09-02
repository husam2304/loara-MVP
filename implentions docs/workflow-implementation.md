# Workflow Implementation

## 1. Goal of the feature

The workflow (or "squad mode") feature allows clinics to design multi-agent call routing flows where a single inbound call can be routed through multiple specialized AI assistants based on caller intent or topic.

Instead of a single monolithic voice assistant, the clinic can define:

- A **front desk** assistant (entry point) that greets and routes calls;
- **Specialist assistants** (scheduling, insurance, triage, billing, etc.) that handle specific domains;
- **Transitions** between assistants based on conditions.

The system then deploys this to Vapi as a "Squad" — Vapi's native multi-agent routing engine — so that during a live call, the system can transfer the caller between different assistants with context.

This is meant to simulate a real clinic phone workflow where a receptionist transfers calls to the right department.

---

## 2. Where it is implemented

### Routing and feature gating

The feature is behind the custom_workflows gating middleware and only available to clinic owners with an active subscription:

- [routes/web.php](../routes/web.php)

Relevant route group:

- GET /workflow
- POST /workflow
- POST /workflow/nodes
- PATCH /workflow/nodes/{workflowNode}
- DELETE /workflow/nodes/{workflowNode}
- PATCH /workflow/nodes/{workflowNode}/entry-point
- POST /workflow/edges
- PATCH /workflow/edges/{workflowEdge}
- DELETE /workflow/edges/{workflowEdge}
- POST /workflow/deploy
- POST /workflow/undeploy

This means the feature is intentionally product-gated, not available as a free feature.

### Data model

The database schema for workflows is defined in:

- [database/migrations/2026_03_13_103632_create_squad_workflow_tables.php](../database/migrations/2026_03_13_103632_create_squad_workflow_tables.php)

Tables created:

- squad_workflows
- workflow_nodes
- workflow_edges

The core models are:

- [app/Models/SquadWorkflow.php](../app/Models/SquadWorkflow.php)
- [app/Models/WorkflowNode.php](../app/Models/WorkflowNode.php)
- [app/Models/WorkflowEdge.php](../app/Models/WorkflowEdge.php)

Important fields:

- SquadWorkflow: clinic_id (unique), name, description, is_active, vapi_squad_id, deployed_at
- WorkflowNode: squad_workflow_id, name, role, system_prompt, greeting_message, model, temperature, voice_provider, voice_name, tool_names (array), is_entry_point, sort_order, vapi_assistant_id
- WorkflowEdge: squad_workflow_id, source_node_id, target_node_id, condition, description, context_plan, sort_order

### Admin UI

The clinic-facing workflow builder page is here:

- [resources/js/pages/Workflow.tsx](../resources/js/pages/Workflow.tsx)

This page allows:

- create a new workflow (one workflow per clinic);
- add, edit, and delete assistant nodes;
- configure each node's system prompt, voice, model, and tools;
- add, edit, and delete transitions (edges) between nodes;
- mark a node as the entry point;
- deploy the workflow to Vapi;
- undeploy the workflow and revert to single-agent mode.

The UI uses a visual node-and-edge builder pattern to represent the flow.

### Controller and validation

The request and controller logic are implemented here:

- [app/Http/Controllers/WorkflowController.php](../app/Http/Controllers/WorkflowController.php)
- [app/Http/Requests/StoreWorkflowRequest.php](../app/Http/Requests/StoreWorkflowRequest.php)
- [app/Http/Requests/StoreWorkflowNodeRequest.php](../app/Http/Requests/StoreWorkflowNodeRequest.php)
- [app/Http/Requests/StoreWorkflowEdgeRequest.php](../app/Http/Requests/StoreWorkflowEdgeRequest.php)
- [app/Http/Requests/UpdateWorkflowNodeRequest.php](../app/Http/Requests/UpdateWorkflowNodeRequest.php)
- [app/Http/Requests/UpdateWorkflowEdgeRequest.php](../app/Http/Requests/UpdateWorkflowEdgeRequest.php)

The controller does the expected CRUD behaviors:

- index loads the clinic's workflow, nodes, edges, and available tools;
- store creates a new workflow and initializes an entry-point "Front Desk" node;
- storeNode adds a new assistant node to the workflow;
- updateNode modifies a node's configuration;
- destroyNode deletes a node (except the entry point);
- setEntryPoint marks a node as the single entry point;
- storeEdge adds a transition (edge) between two nodes;
- updateEdge modifies a transition's condition and description;
- destroyEdge deletes a transition;
- deploy validates the workflow and sends it to Vapi as a Squad;
- undeploy disables squad mode, deletes the Vapi Squad, and reverts to single-agent mode.

---

## 3. How the workflow deployment works

The deployment is where the design becomes operational:

### Deployment logic

In [app/Http/Controllers/WorkflowController.php](../app/Http/Controllers/WorkflowController.php), the `deploy()` method:

1. Loads the workflow with nodes and edges from the database.
2. Validates that:
   - At least 2 nodes exist (squad mode requires multiple assistants);
   - Exactly one node is marked as the entry point;
   - The entry point has at least one outgoing edge;
   - Vapi API key is configured;
   - The clinic's AI configuration is saved with cached tool IDs.
3. Builds a tool map by matching tool names to their Vapi function tool IDs.
4. Iterates through each node and calls `buildSquadMemberPayload` to construct the Vapi assistant definition for that node.
5. Maps outgoing edges to "destinations" so Vapi knows where the assistant can transfer.
6. Creates a "Squad" payload with all members and their destinations.
7. Calls Vapi's API to create or update the Squad.
8. Stores the Vapi Squad ID in the workflow and marks it as active and deployed.

### Building squad members

In [app/Services/VapiService.php](../app/Services/VapiService.php), the `buildSquadMemberPayload` method:

1. Filters the node's tool_names array to only include tools for which the clinic has valid Vapi IDs.
2. Builds an assistant configuration with:
   - name
   - system_prompt
   - greeting_message
   - model (e.g., gpt-4o)
   - temperature
   - voice_provider and voice_name
   - function_tool_ids (filtered by the node's selected tools)
3. Returns the complete Vapi assistant payload.

### Vapi integration

The squad is created/updated via Vapi's API endpoints:

- POST /squad (createSquad)
- PATCH /squad/{id} (updateSquad)
- DELETE /squad/{id} (deleteSquad)

When a call comes in, Vapi routes it to the entry-point assistant. If that assistant decides to transfer (via a tool call or a natural transition), it routes the caller to another squad member using the destinations defined by the workflow edges.

---

## 4. What the code actually does

### Workflow definition

The workflow system provides a data model and UI to define:

- Multiple assistant nodes, each with its own configuration.
- Edges (transitions) between nodes with condition labels.
- One designated entry point.
- Vapi integration to deploy the design.

This is well-structured and fully stored in the database.

### Deployment execution

When deployed:

1. The workflow is sent to Vapi as a Squad configuration.
2. The Vapi Squad ID is stored on the SquadWorkflow record.
3. The workflow is marked as `is_active = true` and `deployed_at` is set.
4. The AiConfiguration model is updated to set `workflow_mode = 'squad'` and cache the Vapi Squad ID.

This makes the workflow operational: the next inbound call will use the squad routing instead of the single-agent flow.

### Undeploy

The `undeploy()` method:

1. Deletes the Vapi Squad by calling the Vapi API.
2. Clears the Vapi Squad ID from the workflow.
3. Marks the workflow as inactive.
4. Resets AiConfiguration to single-agent mode.

---

## 5. Is it fully implemented?

### What is implemented well

The feature is substantially implemented:

- Data models and migrations are complete.
- CRUD operations for workflows, nodes, and edges are fully functional.
- Validation ensures structural integrity (1 entry point, at least 2 nodes, etc.).
- Vapi integration is wired: buildSquadMemberPayload, createSquad, updateSquad, deleteSquad all exist.
- Deployment and undeploy workflows are implemented.
- The UI has node and edge editors with a visual workflow builder.
- Tool filtering ensures nodes only get tools the clinic has configured.
- The seeder creates a realistic demo workflow for testing.

This makes the system a real, operational multi-agent routing engine.

### What is not fully implemented

Several gaps remain:

1. **Transition execution is Vapi-native, not custom**
   - The system stores conditions and descriptions for edges, but the actual routing decision is handled by Vapi's squad logic.
   - The app does not have a separate rule engine or decision layer for transitions; it relies entirely on Vapi to perform the routing based on the squad member destinations.
   - This means the "condition" field is mostly documentation; the actual routing is implicit in how Vapi interprets the destination configuration.

2. **No runtime monitoring or call tracking at the workflow level**
   - The app stores deployed workflow information but does not appear to track or log which nodes a call traversed or why a transfer occurred.
   - There is no visibility into whether transfers succeeded or failed, or which transitions were actually taken during a call.

3. **Context handoff between nodes is implicit**
   - When transferring between nodes, Vapi's squad mode passes conversation history, but the app does not explicitly manage or validate context sharing.
   - There is no app-level context plan enforcement beyond storing `context_plan` on edges.

4. **No test coverage for workflows**
   - No visible feature tests for creating workflows, deploying them, or validating squad mode behavior.
   - No tests for edge cases like cyclic routing, missing destinations, or tool availability during transfer.

5. **Limited operational safety and validation**
   - No validation that all tools assigned to a node are actually available to that node.
   - No check that a node's configuration changes (e.g., tool removal) automatically sync to a deployed squad; manual redeployment is required.
   - No audit trail for workflow changes or deployments.

6. **Error handling during deployment is basic**
   - If Vapi returns an error (e.g., invalid tool ID or API failure), the app logs it but does not provide granular recovery options.
   - Failed deployments can leave the workflow in a partially deployed state without clear remediation steps.

7. **No formal versioning or rollback**
   - Workflow changes are not versioned; updating a node and redeploying immediately replaces the previous squad on Vapi.
   - There is no rollback mechanism or history of deployment states.

---

## 6. Business evaluation

From a product perspective, this is best described as:

- a functional workflow builder and multi-agent routing engine;
- a real operational feature that deploys to Vapi as a Squad;
- suitable for clinics that want to route calls through multiple specialized assistants;
- not a full enterprise workflow orchestration system with advanced routing logic, compliance tracking, or deep call analytics.

It is useful for clinics that want to:

- Create themed assistants (front desk, scheduler, insurance specialist, triage nurse).
- Route inbound calls based on caller intent.
- Ensure each assistant is optimized for its role.
- Leverage Vapi's native squad mode for call transfers.

However, it lacks:

- Visibility into actual call flows and routing outcomes.
- Audit trails and compliance logging.
- Advanced conditional routing or branching logic.
- Real-time monitoring or alerts on transfer success/failure.

---

## 7. Overall assessment

The workflow feature is partially implemented and operationally real.

The honest status is:

- implemented: data models, CRUD, deployment/undeploy, Vapi Squad integration, node and edge configuration, entry point management, tool filtering, UI workflow builder
- incomplete: runtime call tracking, context handoff enforcement, advanced conditional routing, deployment versioning and rollback, comprehensive error recovery, test coverage, audit logging

In short, the project has a working multi-agent workflow builder that deploys to Vapi and enables call routing through multiple specialized assistants. However, the runtime visibility and operational safety features are minimal compared to enterprise workflow systems.

The feature is best positioned as a flexible and functional squad routing tool for clinics that want assistant specialization and call-based transfer logic, but not as a mission-critical compliance or audit system.
