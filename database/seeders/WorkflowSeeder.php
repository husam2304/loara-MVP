<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\SquadWorkflow;
use App\Models\User;
use Illuminate\Database\Seeder;

class WorkflowSeeder extends Seeder
{
    /**
     * Seed a realistic multi-assistant "squad" workflow for the demo clinic so the
     * visual Workflow Builder renders a populated canvas (front desk → branches)
     * instead of the empty state.
     */
    public function run(): void
    {
        $clinic = User::where('email', 'clinic@mail.com')->first()?->clinic ?? Clinic::first();

        if (! $clinic) {
            return;
        }

        $workflow = SquadWorkflow::updateOrCreate(
            ['clinic_id' => $clinic->id],
            [
                'name' => 'Front Desk Squad',
                'description' => 'Routes inbound calls from a front-desk receptionist to specialised assistants for scheduling, insurance, and clinical triage.',
                'is_active' => true,
            ],
        );

        // Rebuild from scratch so re-seeding is idempotent.
        $workflow->edges()->delete();
        $workflow->nodes()->delete();

        $frontDesk = $workflow->nodes()->create([
            'name' => 'Front Desk',
            'role' => 'Receptionist',
            'system_prompt' => 'You are the friendly front-desk receptionist. Greet the caller, identify them, and route the call to the right specialist.',
            'greeting_message' => 'شكرًا لاتصالك، كيف بقدر أساعدك اليوم؟',
            'model' => 'gpt-4o',
            'temperature' => 0.7,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'tool_names' => ['lookup_patient', 'check_appointment_types', 'check_schedule', 'create_patient_lead'],
            'is_entry_point' => true,
            'sort_order' => 0,
        ]);

        $scheduling = $workflow->nodes()->create([
            'name' => 'Scheduling',
            'role' => 'Scheduler',
            'system_prompt' => 'You handle booking, rescheduling, and cancelling appointments. Confirm details before any change.',
            'greeting_message' => 'بقدر أساعدك بخصوص موعدك. شو حابب تسوي؟',
            'model' => 'gpt-4o',
            'temperature' => 0.6,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'tool_names' => ['book_appointment', 'reschedule_appointment', 'cancel_appointment', 'list_upcoming_appointments', 'check_schedule'],
            'is_entry_point' => false,
            'sort_order' => 1,
        ]);

        $insurance = $workflow->nodes()->create([
            'name' => 'Insurance & Billing',
            'role' => 'Billing Specialist',
            'system_prompt' => 'You answer insurance and billing questions and verify coverage eligibility.',
            'greeting_message' => 'بقدر أساعدك بخصوص التأمين والفوترة. شو محتاج؟',
            'model' => 'gpt-4o',
            'temperature' => 0.5,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'tool_names' => ['verify_insurance', 'lookup_patient'],
            'is_entry_point' => false,
            'sort_order' => 2,
        ]);

        $triage = $workflow->nodes()->create([
            'name' => 'Nurse Triage',
            'role' => 'Triage Nurse',
            'system_prompt' => 'You assess symptom urgency. For anything time-sensitive, transfer to a human immediately.',
            'greeting_message' => 'احكيلي شو الأعراض يلي حاسس فيها.',
            'model' => 'gpt-4o',
            'temperature' => 0.4,
            'voice_provider' => 'vapi',
            'voice_name' => 'Elliot',
            'tool_names' => ['assess_urgency', 'transfer_call', 'create_callback_task'],
            'is_entry_point' => false,
            'sort_order' => 3,
        ]);

        $transitions = [
            [$frontDesk, $scheduling, 'Caller wants to book, reschedule, or cancel an appointment'],
            [$frontDesk, $insurance, 'Caller has an insurance or billing question'],
            [$frontDesk, $triage, 'Caller describes symptoms or a possible medical emergency'],
            [$scheduling, $frontDesk, 'Appointment handled — return to the front desk'],
        ];

        foreach ($transitions as $i => [$from, $to, $condition]) {
            $workflow->edges()->create([
                'source_node_id' => $from->id,
                'target_node_id' => $to->id,
                'condition' => $condition,
                'context_plan' => 'all',
                'sort_order' => $i + 1,
            ]);
        }
    }
}
