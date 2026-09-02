<?php

namespace Database\Seeders;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Enums\TaskType;
use App\Models\Call;
use App\Models\Clinic;
use App\Models\Patient;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;

class TaskSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicTasks($clinic);
        }
    }

    private function seedClinicTasks(Clinic $clinic): void
    {
        $users = User::where('clinic_id', $clinic->id)->get();
        $patients = Patient::where('clinic_id', $clinic->id)->take(10)->get();
        $calls = Call::where('clinic_id', $clinic->id)->take(10)->get();

        $tasks = [
            ['title' => 'الاتصال بالمريض لإرجاع مكالمته', 'type' => TaskType::Callback, 'priority' => TaskPriority::High, 'status' => TaskStatus::Pending],
            ['title' => 'متابعة نتائج التحاليل المخبرية', 'type' => TaskType::FollowUp, 'priority' => TaskPriority::Normal, 'status' => TaskStatus::InProgress],
            ['title' => 'مراجعة الموافقة المسبقة لفحص الرنين المغناطيسي', 'type' => TaskType::Insurance, 'priority' => TaskPriority::Normal, 'status' => TaskStatus::Pending],
            ['title' => 'معالجة طلب تجديد وصفة دوائية', 'type' => TaskType::Prescription, 'priority' => TaskPriority::High, 'status' => TaskStatus::Pending],
            ['title' => 'التحقق من التأمين لمريض جديد', 'type' => TaskType::Insurance, 'priority' => TaskPriority::Low, 'status' => TaskStatus::Pending],
            ['title' => 'جدولة موعد متابعة', 'type' => TaskType::FollowUp, 'priority' => TaskPriority::Normal, 'status' => TaskStatus::Completed],
            ['title' => 'مراجعة نص مكالمة تم تصعيدها من الذكاء الاصطناعي', 'type' => TaskType::Review, 'priority' => TaskPriority::Urgent, 'status' => TaskStatus::Pending],
            ['title' => 'تحديث البيانات الشخصية للمريض', 'type' => TaskType::General, 'priority' => TaskPriority::Low, 'status' => TaskStatus::Completed],
            ['title' => 'معالجة طلب اتصال بخصوص استفسار فوترة', 'type' => TaskType::Callback, 'priority' => TaskPriority::Normal, 'status' => TaskStatus::InProgress],
            ['title' => 'تأكيد تعديلات الموعد مع المريض', 'type' => TaskType::FollowUp, 'priority' => TaskPriority::Normal, 'status' => TaskStatus::Pending],
        ];

        foreach ($tasks as $i => $data) {
            Task::create(array_merge($data, [
                'clinic_id' => $clinic->id,
                'patient_id' => $patients->count() > $i ? $patients[$i]->id : null,
                'call_id' => $calls->count() > $i ? $calls[$i]->id : null,
                'assigned_to' => $users->random()->id,
                'due_at' => $data['status'] === TaskStatus::Completed ? null : now()->addDays(rand(1, 5)),
                'completed_at' => $data['status'] === TaskStatus::Completed ? now()->subDays(rand(1, 3)) : null,
                'completed_by' => $data['status'] === TaskStatus::Completed ? $users->random()->id : null,
            ]));
        }
    }
}
