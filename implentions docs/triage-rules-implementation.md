# Triage Rules Implementation

## 1. Goal of the feature

The triage feature is meant to give the clinic AI voice assistant a rule-based clinical screening layer before routine appointment booking. In practice, the system tries to:

- detect when a caller describes symptoms that may be urgent or emergent;
- match the symptoms against clinic-defined rules and keyword phrases;
- classify the case with a priority such as critical, high, medium, or low;
- recommend an action such as transfer, callback, alert, or appointment booking;
- create follow-up tasks so urgent cases are not lost in the call flow.

This is not a full medical triage engine. It is a clinic-configurable symptom screening layer attached to the Vapi voice workflow.

---

## 2. Where it is implemented

### Routing and feature gating

The feature is behind the triage gating middleware and only available to clinic owners with an active subscription:

- [routes/web.php](../routes/web.php)

Relevant route group:

- GET /triage-rules
- POST /triage-rules
- PATCH /triage-rules/{triageRule}
- PATCH /triage-rules/{triageRule}/toggle
- DELETE /triage-rules/{triageRule}

This means the feature is intentionally product-gated, not available as a free or general route.

### Data model

The database schema for the triage subsystem is defined in:

- [database/migrations/2025_03_05_000009_create_triage_tables.php](../database/migrations/2025_03_05_000009_create_triage_tables.php)

Tables created:

- triage_rules
- triage_keywords
- escalation_paths

The core models are:

- [app/Models/TriageRule.php](../app/Models/TriageRule.php)
- [app/Models/TriageKeyword.php](../app/Models/TriageKeyword.php)
- [app/Models/EscalationPath.php](../app/Models/EscalationPath.php)

Important fields:

- TriageRule: clinic_id, name, description, priority, conditions, action, target_role, target_user_id, is_active, sort_order
- TriageKeyword: triage_rule_id, keyword, category
- EscalationPath: clinic_id, level, name, description, target_role, timeout_seconds, is_active

### Enums

The rule system uses enums for priority and action:

- [app/Enums/TriagePriority.php](../app/Enums/TriagePriority.php)
- [app/Enums/TriageAction.php](../app/Enums/TriageAction.php)

These are the operational values used by the rule engine and UI.

### Admin UI

The clinic-facing management page is here:

- [resources/js/pages/TriageRules.tsx](../resources/js/pages/TriageRules.tsx)

This page allows:

- create a new triage rule;
- edit an existing rule;
- toggle active/inactive state;
- delete a rule;
- search rules;
- view escalation paths and keyword tags.

The page is built to manage the rule catalog, not to execute clinical logic itself.

### Controller and validation

The request and controller logic are implemented here:

- [app/Http/Controllers/TriageRuleController.php](../app/Http/Controllers/TriageRuleController.php)
- [app/Http/Requests/StoreTriageRuleRequest.php](../app/Http/Requests/StoreTriageRuleRequest.php)
- [app/Http/Requests/UpdateTriageRuleRequest.php](../app/Http/Requests/UpdateTriageRuleRequest.php)

The controller does the expected CRUD behaviors:

- index loads active clinic rules and escalation paths;
- store creates a rule and related keyword rows;
- update modifies the rule and re-syncs keywords when keywords are included;
- toggle switches active state;
- destroy deletes the rule and its keywords;
- authorizeRule restricts access to the clinic's own records.

---

## 3. How the actual runtime triage works

The real logic sits in the Vapi tool dispatcher, not just in the CRUD layer:

- [app/Services/VapiToolDispatcher.php](../app/Services/VapiToolDispatcher.php)

The tool is registered in the Vapi function catalog here:

- [app/Services/VapiService.php](../app/Services/VapiService.php)

The function name is `assess_urgency`.

### Runtime flow

1. A caller describes symptoms during a Vapi call.
2. The assistant calls `assess_urgency` with the symptom text.
3. The dispatcher loads all active triage rules for the clinic, ordered by priority and sort order.
4. It checks the keywords in the rule's `conditions['keywords']` array and the related `triage_keywords` rows.
5. It matches using substring checks against the lower-cased symptom text.
6. If a rule matches, the system selects the first matching rule in priority order.
7. It builds a response message based on the matched rule's priority:
   - critical -> emergency response; advise 911 / ER
   - high -> transfer/urgent evaluation
   - medium -> prompt attention / scheduling
   - low -> routine scheduling
8. If the priority is high or critical, it creates a `Task` record for the call.
9. The dispatcher returns structured data with priority, action, matched keywords, and after-hours context.

This is the real operational core of the feature.

---

## 4. What the code actually does

### Matching logic

The matching logic in [app/Services/VapiToolDispatcher.php](../app/Services/VapiToolDispatcher.php) is intentionally simple:

- lower-case the symptom text;
- iterate rules in priority order;
- check whether any keyword string appears inside the symptom string;
- if matched, stop at the first relevant rule.

This is rule-based string matching, not medical reasoning, risk scoring, or decision-tree evaluation.

### Action mapping

The rule action value is a string enum from `TriageAction`:

- transfer_immediately
- transfer_nurse
- queue_callback
- send_alert
- route_to_voicemail

However, the actual dispatcher does not fully execute each action as a separate workflow step. It mostly:

- returns the action value in the structured payload;
- uses priority to drive response text;
- creates a task for high/critical cases.

That means the action is represented and surfaced, but the escalation workflow is not fully enforced end-to-end in a formal execution engine.

### After-hours logic

The dispatcher also checks clinic hours through `checkClinicHours` and adds adjusted messaging for after-hours calls. This gives triage some operational context, but it is still a call-response layer rather than a full call routing engine.

---

## 5. Is it fully implemented?

### What is implemented well

The feature is not fake or empty. It is materially implemented in multiple layers:

- admin UI exists to define rules;
- backend CRUD exists with validation and ownership checks;
- model and migration structure is present;
- Vapi tool exposes triage decision capability;
- the runtime dispatcher evaluates symptom text against active rules;
- urgent/high cases create tasks;
- rules are stored per clinic and scoped by clinic_id.

This makes it a real, working triage layer for a clinic AI call flow.

### What is not fully implemented

The feature is not a production-grade clinical triage system yet. The main current gaps are:

1. Simple keyword matching instead of structured risk scoring
   - It matches substrings, not true clinical logic.
   - It cannot reason about severity nuance, time-based symptoms, or combined symptoms.

2. Escalation path integration is incomplete
   - The `EscalationPath` model and table exist, but they are not fully wired into the runtime triage engine.
   - The UI displays escalation paths, but they are not fully enforced as a real operational escalation chain.

3. `target_role` and `target_user_id` are not used in the actual dispatcher flow
   - The rule model supports a target role or person, but the runtime does not appear to translate that into a real transfer or handoff action.

4. The action enum is only partially operationalized
   - The system returns the action value and response text, but does not appear to explicitly run the different action branches as full operational actions.

5. No meaningful test coverage for the triage subsystem
   - There is no clear triage-specific feature test coverage validating urgency matching, edge cases, or call behavior.

6. No strong safety/compliance model
   - The product is positioned around patient intake and urgency routing, but the implementation lacks deeper clinical safety checks, escalation validation, audit history, and review workflow.

7. `conditions` snapshot is a shallow representation
   - The database stores rule conditions in JSON, but the dispatcher logic still relies on a separate keyword relation and basic matching. It is not a robust declarative rules engine.

---

## 6. Business evaluation

From a product perspective, this is best described as:

- a functional prototype / operational beta triage layer;
- a real voice assistant support feature with clinic configuration;
- not a medical-grade emergency decision system.

It is useful for symptom routing and basic urgency detection, especially when the clinic wants the AI to avoid booking or to prioritize urgent cases. However, it should not be treated as a replacement for actual clinical triage or emergency protocols.

---

## 7. Overall assessment

The goal of the triage feature is valid and the implementation is meaningful. The app has the intended architecture for a clinic triage configuration system and it actively uses that configuration during a Vapi call.

The feature is therefore partially implemented but operationally real.

The honest status is:

- implemented: rule management, runtime symptom matching, Vapi integration, high/critical task creation
- incomplete: deeper escalation workflow, formal safety logic, stronger role-based dispatch, end-to-end clinical automation, tests

In short, the project has a working triage screening layer, but not a complete production-grade clinical routing engine.
