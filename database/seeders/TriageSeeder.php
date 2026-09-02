<?php

namespace Database\Seeders;

use App\Enums\KeywordCategory;
use App\Enums\TriageAction;
use App\Enums\TriagePriority;
use App\Models\Clinic;
use App\Models\EscalationPath;
use App\Models\TriageKeyword;
use App\Models\TriageRule;
use Illuminate\Database\Seeder;

class TriageSeeder extends Seeder
{
    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicTriage($clinic);
        }
    }

    private function seedClinicTriage(Clinic $clinic): void
    {
        $rules = [
            [
                'name' => 'طارئ - ألم في الصدر',
                'description' => 'المريض يشتكي من ألم أو ضيق أو ثقل في الصدر',
                'priority' => TriagePriority::Critical,
                'conditions' => ['keywords' => ['ألم في الصدر', 'ضيق في الصدر', 'نوبة قلبية']],
                'action' => TriageAction::TransferImmediately,
                'target_role' => 'provider',
                'keywords' => [
                    ['keyword' => 'صدر', 'category' => KeywordCategory::Emergency],
                    ['keyword' => 'قلب', 'category' => KeywordCategory::Emergency],
                ],
            ],
            [
                'name' => 'طارئ - صعوبة في التنفس',
                'description' => 'المريض يشتكي من ضيق تنفس أو صعوبة في التنفس',
                'priority' => TriagePriority::Critical,
                'conditions' => ['keywords' => ['ما بقدر أتنفس', 'ضيق تنفس', 'صعوبة تنفس']],
                'action' => TriageAction::TransferImmediately,
                'target_role' => 'provider',
                'keywords' => [
                    ['keyword' => 'تنفس', 'category' => KeywordCategory::Emergency],
                    ['keyword' => 'اختناق', 'category' => KeywordCategory::Emergency],
                ],
            ],
            [
                'name' => 'أزمة نفسية',
                'description' => 'المريض يعبر عن أفكار انتحارية أو ضيق نفسي شديد',
                'priority' => TriagePriority::Critical,
                'conditions' => ['keywords' => ['أفكار انتحارية', 'إيذاء النفس', 'بدي أموت']],
                'action' => TriageAction::TransferImmediately,
                'target_role' => 'provider',
                'keywords' => [
                    ['keyword' => 'جرعة زائدة', 'category' => KeywordCategory::Emergency],
                ],
            ],
            [
                'name' => 'حساسية شديدة',
                'description' => 'المريض يشتكي من أعراض حساسية شديدة',
                'priority' => TriagePriority::High,
                'conditions' => ['keywords' => ['حساسية شديدة', 'تورم', 'شرى جلدي']],
                'action' => TriageAction::TransferNurse,
                'target_role' => 'nurse',
                'keywords' => [
                    ['keyword' => 'حساسية', 'category' => KeywordCategory::Clinical],
                ],
            ],
            [
                'name' => 'نزاع على الفاتورة',
                'description' => 'المريض لديه استفسار حول فاتورته أو الرسوم المستحقة',
                'priority' => TriagePriority::Low,
                'conditions' => ['keywords' => ['فاتورة', 'رسوم', 'محاسبة زيادة']],
                'action' => TriageAction::QueueCallback,
                'target_role' => 'billing',
                'keywords' => [
                    ['keyword' => 'عاجل', 'category' => KeywordCategory::General],
                    ['keyword' => 'سقوط', 'category' => KeywordCategory::Clinical],
                ],
            ],
        ];

        foreach ($rules as $i => $data) {
            $keywords = $data['keywords'];
            unset($data['keywords']);

            $rule = TriageRule::create(array_merge($data, [
                'clinic_id' => $clinic->id,
                'sort_order' => $i,
                'is_active' => true,
            ]));

            foreach ($keywords as $kw) {
                TriageKeyword::create([
                    'triage_rule_id' => $rule->id,
                    'keyword' => $kw['keyword'],
                    'category' => $kw['category'],
                    'created_at' => now(),
                ]);
            }
        }

        $paths = [
            ['level' => 1, 'name' => 'الوكيل الذكي', 'description' => 'المعالجة الأولية بواسطة المساعد الصوتي الذكي', 'target_role' => 'ai', 'timeout_seconds' => 30],
            ['level' => 2, 'name' => 'فريق الاستقبال', 'description' => 'التصعيد إلى فريق الاستقبال', 'target_role' => 'staff', 'timeout_seconds' => 60],
            ['level' => 3, 'name' => 'الطبيب المناوب', 'description' => 'التصعيد النهائي إلى الطبيب المتوفر', 'target_role' => 'provider', 'timeout_seconds' => 120],
        ];

        foreach ($paths as $path) {
            EscalationPath::create(array_merge($path, [
                'clinic_id' => $clinic->id,
                'is_active' => true,
            ]));
        }
    }
}
