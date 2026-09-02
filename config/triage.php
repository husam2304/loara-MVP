<?php

use App\Enums\UserRole;

return [

    /*
    |--------------------------------------------------------------------------
    | Keyword Category Weights
    |--------------------------------------------------------------------------
    |
    | When TriageMatchEngine scores a rule, each matched TriageKeyword
    | contributes its category's weight to the rule's total score. Rules
    | with higher scores win over other rules in the same priority tier,
    | so emergency-category hits should outweigh general/billing chatter.
    | Keywords supplied via the free-text `conditions` JSON (not tied to a
    | category) always contribute a flat weight of 1.
    |
    */

    'keyword_weights' => [
        'emergency' => 3,
        'clinical' => 2,
        'general' => 1,
        'billing' => 1,
    ],

    /*
    |--------------------------------------------------------------------------
    | Target Role Mapping
    |--------------------------------------------------------------------------
    |
    | A TriageRule/EscalationPath stores `target_role` as a free-text string
    | (e.g. "provider", "nurse", "billing") so clinics can label roles in
    | their own terms. This maps each of those labels onto one or more real
    | App\Enums\UserRole values EscalationResolver is allowed to assign work
    | to. Unmapped labels resolve to no one, and the resolver falls back to
    | the clinic's escalation ladder.
    |
    */

    'role_map' => [
        'provider' => [UserRole::Provider],
        'nurse' => [UserRole::Provider],
        'clinician' => [UserRole::Provider],
        'billing' => [UserRole::Billing],
        'staff' => [UserRole::Staff, UserRole::ClinicOwner],
        'front_desk' => [UserRole::Staff, UserRole::ClinicOwner],
        'admin' => [UserRole::ClinicOwner],
        'owner' => [UserRole::ClinicOwner],
    ],

];
