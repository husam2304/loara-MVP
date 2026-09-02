# Workflow Squad Deployment Fix - Implementation

## Summary

The workflow squad deployment now correctly extracts and stores `vapi_assistant_id` for each assistant node after deployment.

---

## What Was Fixed

### Problem
When deploying a workflow to Vapi:
- The squad was created successfully ✅
- The squad ID was stored in `SquadWorkflow.vapi_squad_id` ✅
- **But** individual assistant IDs were never extracted from the Vapi response ❌
- Result: `WorkflowNode.vapi_assistant_id` remained empty/null ❌

### Solution
Two changes were made:

#### 1. Added Helper Method to VapiService
**File:** `app/Services/VapiService.php`

```php
/**
 * Extract assistant IDs from a squad response and return a mapping of assistant names to IDs.
 *
 * When Vapi creates or updates a squad, the response includes member assistants with their IDs.
 * This method extracts that mapping so the app can store vapi_assistant_id on each WorkflowNode.
 *
 * @param  array  $squad  The squad response from Vapi containing members array
 * @return array<string, string>  Mapping of assistant name => vapi assistant ID
 */
public function extractSquadAssistantIds(array $squad): array
{
    $mapping = [];

    foreach ($squad['members'] ?? [] as $member) {
        $assistant = $member['assistant'] ?? null;

        if (is_array($assistant)) {
            $assistantId = $assistant['id'] ?? null;
            $assistantName = $assistant['name'] ?? null;

            if ($assistantId && $assistantName) {
                $mapping[$assistantName] = $assistantId;
            }
        }
    }

    return $mapping;
}
```

**Purpose:** Safely extracts the mapping of assistant names to their Vapi IDs from the squad response.

#### 2. Updated Deploy Logic in WorkflowController
**File:** `app/Http/Controllers/WorkflowController.php`, `deploy()` method

**Before:**
```php
if ($workflow->vapi_squad_id) {
    $vapi->updateSquad($workflow->vapi_squad_id, $squadPayload);
} else {
    $squad = $vapi->createSquad($squadPayload);
    $workflow->vapi_squad_id = $squad['id'];
}

$workflow->update([
    'vapi_squad_id' => $workflow->vapi_squad_id,
    'is_active' => true,
    'deployed_at' => now(),
]);
```

**After:**
```php
if ($workflow->vapi_squad_id) {
    $squad = $vapi->updateSquad($workflow->vapi_squad_id, $squadPayload);
} else {
    $squad = $vapi->createSquad($squadPayload);
    $workflow->vapi_squad_id = $squad['id'];
}

// Extract assistant IDs from the squad response and store them on each node
$assistantIdMapping = $vapi->extractSquadAssistantIds($squad);
foreach ($assistantIdMapping as $assistantName => $assistantId) {
    $workflow->nodes()
        ->where('name', $assistantName)
        ->update(['vapi_assistant_id' => $assistantId]);
}

$workflow->update([
    'vapi_squad_id' => $workflow->vapi_squad_id,
    'is_active' => true,
    'deployed_at' => now(),
]);

Log::info('Squad deployed successfully with assistants', [
    'squad_id' => $workflow->vapi_squad_id,
    'clinic_id' => $clinic->id,
    'assistant_count' => count($assistantIdMapping),
    'assistant_mapping' => $assistantIdMapping,
]);
```

**Changes:**
- Capture the squad response from both `createSquad()` and `updateSquad()`
- Call `extractSquadAssistantIds()` to get the name-to-ID mapping
- Loop through the mapping and update each `WorkflowNode` with its `vapi_assistant_id`
- Log the deployment with the assistant mapping for debugging

---

## How It Works Now

1. **Deploy Workflow**
   - User clicks "Deploy" in the Workflow UI
   - Controller builds squad payload with all nodes and edges
   - Calls Vapi API to create/update the squad

2. **Extract IDs**
   - Receives squad response from Vapi (contains all members with their IDs)
   - Calls `extractSquadAssistantIds()` to parse the response
   - Returns mapping: `{ "Front Desk" => "asst-abc123", "Scheduling" => "asst-xyz789", ... }`

3. **Store IDs**
   - Loops through the mapping
   - Updates each `WorkflowNode` by name with its corresponding Vapi assistant ID
   - Each node now has `vapi_assistant_id` populated

4. **Logging**
   - Logs the successful deployment with the assistant mapping
   - Useful for debugging and auditing

---

## Testing the Fix

### 1. Deploy a workflow (if you haven't already)

In the Workflow UI:
- Create/edit a workflow with at least 2 nodes
- Click "Deploy"
- You should see "Workflow deployed successfully."

### 2. Check the database

Run this query:

```sql
SELECT id, name, vapi_assistant_id FROM workflow_nodes 
WHERE squad_workflow_id = (
    SELECT id FROM squad_workflows WHERE clinic_id = YOUR_CLINIC_ID
);
```

**Expected result:**
- All nodes should have a non-null `vapi_assistant_id`
- Each ID should look like: `asst-1234abcd5678efgh`

**Before fix:** All IDs were NULL
**After fix:** All IDs are populated

### 3. Verify in Vapi Dashboard

Go to your Vapi dashboard and check the squad:
- Navigate to Squads
- Find your deployed squad by name
- Open it and view members
- Each member should show the assistant ID that's now in your database

### 4. Check application logs

Look at your Laravel logs (storage/logs/):

```
[2026-09-01 10:30:45] local.INFO: Squad deployed successfully with assistants
{
  "squad_id": "squad-abc123xyz789",
  "clinic_id": 1,
  "assistant_count": 4,
  "assistant_mapping": {
    "Front Desk": "asst-front-desk-1234",
    "Scheduling": "asst-scheduling-5678",
    "Insurance & Billing": "asst-insurance-9012",
    "Nurse Triage": "asst-triage-3456"
  }
}
```

If you see this log entry, the fix is working correctly.

---

## Benefits

With this fix:

✅ Each `WorkflowNode` now has its `vapi_assistant_id` stored after deployment
✅ The app has complete references to all deployed assistants
✅ Future features can use these IDs for:
   - Direct assistant routing or transfers
   - Call analytics and monitoring
   - Assistant-specific updates or syncing
   - Audit trails and compliance logging

---

## Backwards Compatibility

The fix is fully backwards compatible:
- Existing workflows will continue to work
- On the next deployment/update, all assistant IDs will be populated
- No migration needed; the `vapi_assistant_id` column already exists

To backfill existing workflows:

1. Open each workflow in the UI
2. Click "Deploy" (or "Re-deploy" if already active)
3. The assistant IDs will be extracted and stored

---

## Related Documentation

See also:
- [docs/workflow-implementation.md](workflow-implementation.md) - Full workflow architecture
- [docs/workflow-squad-issue-analysis.md](workflow-squad-issue-analysis.md) - Detailed problem analysis
