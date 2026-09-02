<?php

namespace Database\Seeders;

use App\Enums\CallDirection;
use App\Enums\CallResolution;
use App\Enums\CallSentiment;
use App\Enums\CallSpeaker;
use App\Enums\CallStatus;
use App\Enums\CallToolName;
use App\Enums\CallType;
use App\Models\Call;
use App\Models\CallRecording;
use App\Models\CallToolInvocation;
use App\Models\CallTranscript;
use App\Models\Clinic;
use App\Models\InsuranceProvider;
use App\Models\Patient;
use Database\Seeders\Concerns\JordanianData;
use Illuminate\Database\Seeder;

class CallSeeder extends Seeder
{
    use JordanianData;

    public function run(): void
    {
        foreach (Clinic::all() as $clinic) {
            $this->seedClinicCalls($clinic);
        }
    }

    private function seedClinicCalls(Clinic $clinic): void
    {
        $patients = Patient::where('clinic_id', $clinic->id)->get();
        $insuranceProviders = InsuranceProvider::where('clinic_id', $clinic->id)->get();

        for ($i = 0; $i < 45; $i++) {
            $patient = fake()->optional(0.8)->randomElement($patients->all());
            // Keep everything within the current month so dashboard/analytics
            // metrics (which filter to this month) are populated, biased to the
            // last week so the 7-day volume chart is lively.
            $startedAt = fake()->dateTimeBetween('-13 days', 'now');
            $durationSeconds = fake()->numberBetween(60, 210);
            $isCompleted = fake()->boolean(88);
            $isMissed = ! $isCompleted && fake()->boolean(60);

            // Resolution is deterministic so the AI-resolution rate is strong but
            // believable (~91%), never a suspicious 100%. Only completed calls
            // count toward the rate; voicemails are flagged for callback.
            if ($isMissed) {
                $resolution = null;
            } elseif (! $isCompleted) {
                $resolution = CallResolution::CallbackNeeded;
            } elseif ($i % 16 === 0) {
                $resolution = CallResolution::Escalated;
            } elseif ($i % 23 === 0) {
                $resolution = CallResolution::CallbackNeeded;
            } else {
                $resolution = CallResolution::Resolved;
            }

            $type = $this->weighted([
                [CallType::Appointment, 30], [CallType::Reminder, 18], [CallType::Prescription, 15],
                [CallType::Insurance, 12], [CallType::Billing, 10], [CallType::FollowUp, 8],
                [CallType::Triage, 4], [CallType::General, 3],
            ]);

            $callerFirstName = $patient?->first_name ?? explode(' ', $this->randomJordanianName())[0];
            $scenario = $this->buildScenario($type, $clinic, $callerFirstName, $insuranceProviders);

            $call = Call::create([
                'clinic_id' => $clinic->id,
                'caller_phone' => $patient ? $patient->phone : $this->randomJordanianMobile(),
                'caller_name' => $patient ? "{$patient->first_name} {$patient->last_name}" : $this->randomJordanianName(),
                'patient_id' => $patient?->id,
                'direction' => fake()->randomElement([CallDirection::Inbound, CallDirection::Inbound, CallDirection::Inbound, CallDirection::Outbound]),
                'type' => $type,
                'status' => $isMissed ? CallStatus::Missed : ($isCompleted ? CallStatus::Completed : CallStatus::Voicemail),
                'duration_seconds' => $isMissed ? 0 : $durationSeconds,
                'started_at' => $startedAt,
                'ended_at' => $isMissed ? null : (clone $startedAt)->modify("+{$durationSeconds} seconds"),
                'answered_at' => $isMissed ? null : (clone $startedAt)->modify('+2 seconds'),
                'ai_handled' => ! $isMissed,
                'ai_confidence_score' => $isMissed ? null : fake()->randomFloat(2, 0.88, 0.99),
                'sentiment' => $isMissed ? null : $this->weighted([
                    [CallSentiment::Positive, 80], [CallSentiment::Neutral, 17], [CallSentiment::Negative, 3],
                ]),
                'language' => 'ar',
                'resolution' => $resolution,
                'summary' => $isMissed ? null : $scenario['summary'],
                'cost' => $isMissed ? 0 : fake()->randomFloat(4, 0.05, 0.35),
            ]);

            if ($isCompleted) {
                $this->seedTranscripts($call, $scenario['lines']);
                $this->seedToolInvocations($call);

                if (fake()->boolean(60)) {
                    CallRecording::create([
                        'call_id' => $call->id,
                        'file_path' => "recordings/{$call->id}.wav",
                        'duration_seconds' => $durationSeconds,
                        'file_size_bytes' => $durationSeconds * 16000,
                        'format' => 'wav',
                        'is_redacted' => false,
                        'created_at' => $call->ended_at,
                    ]);
                }
            }
        }
    }

    /**
     * Pick a value from a list of [value, weight] pairs.
     *
     * @param  array<int, array{0: mixed, 1: int}>  $pairs
     */
    private function weighted(array $pairs): mixed
    {
        $total = array_sum(array_column($pairs, 1));
        $roll = fake()->numberBetween(1, $total);
        $cursor = 0;

        foreach ($pairs as [$value, $weight]) {
            $cursor += $weight;
            if ($roll <= $cursor) {
                return $value;
            }
        }

        return $pairs[0][0];
    }

    /**
     * Build a natural Jordanian-Arabic conversation scenario matching the
     * call's type, along with a matching summary. Placeholders are resolved
     * against the clinic, caller, a random specialty, and (for insurance
     * calls) a random insurance provider so the content stays internally
     * consistent with the rest of the seeded data.
     *
     * @return array{lines: array<int, string>, summary: string}
     */
    private function buildScenario(CallType $type, Clinic $clinic, string $callerFirstName, $insuranceProviders): array
    {
        $specialty = fake()->randomElement($this->jordanianSpecialties);
        $insurer = $insuranceProviders->isNotEmpty()
            ? $insuranceProviders->random()->name
            : 'التأمين الصحي';

        $pool = match ($type) {
            CallType::Appointment => [
                [
                    'lines' => [
                        'مرحبا فيك، معك المساعد الافتراضي لعيادة {clinic}. كيف بقدر أساعدك اليوم؟',
                        'مرحبا، يعطيكم العافية، بدي أحجز موعد مع دكتور {specialty}.',
                        'تكرم، الله يعافيك. ممكن اسمك الكامل لو سمحت؟',
                        'اسمي {name}.',
                        'تمام لقيت ملفك يا {name}. الدكتور عنده فراغ يوم الأحد الساعة عشرة الصبح أو الثلاثاء الساعة وحدة الظهر، أيهم بناسبك؟',
                        'الأحد الساعة عشرة أحسن إلي.',
                        'ممتاز، حجزتلك يوم الأحد الساعة عشرة صباحًا مع دكتور {specialty}. رح توصلك رسالة تأكيد. في شي ثاني بقدر أساعدك فيه؟',
                        'لا يعطيك العافية، هذا كل شي.',
                    ],
                    'summary' => 'اتصال لحجز موعد جديد مع طبيب {specialty}، تم تأكيد الموعد يوم الأحد الساعة عشرة صباحًا.',
                ],
                [
                    'lines' => [
                        'أهلا وسهلا، معك مساعد عيادة {clinic} الصوتي. تفضل كيف بقدر أخدمك؟',
                        'بدي أعرف مين الدكاترة المتوفرين عندكم بمجال {specialty}.',
                        'عندنا دكتور مختص بـ{specialty} متوفر أغلب أيام الأسبوع ما عدا الجمعة. بتحب أحجزلك موعد معه؟',
                        'أيوا لو سمحت، أي يوم فاضي قريب؟',
                        'في فراغ بكرا الساعة أحد عشر أو بعد بكرا الساعة اثنين، شو بيناسبك أكتر؟',
                        'بكرا أحسن.',
                        'تمام يا {name}، حجزتلك بكرا الساعة أحد عشر الصبح. بتحتاج أي شي ثاني؟',
                        'لا شكرا، يعطيك العافية.',
                    ],
                    'summary' => 'اتصال استفسار عن توفر طبيب {specialty}، تم حجز موعد له غدًا الساعة الحادية عشرة صباحًا.',
                ],
            ],
            CallType::Reminder => [
                [
                    'lines' => [
                        'مرحبا {name}، معك مساعد عيادة {clinic} الصوتي، بحكي معك بخصوص تذكير بموعدك القادم.',
                        'أهلين، تفضل.',
                        'عندك موعد يوم الخميس الساعة اثنين ونص مع دكتور {specialty}. بتأكد الموعد؟',
                        'أيوا إن شاء الله بكون موجود.',
                        'ممتاز، رح نبعثلك رسالة تذكير قبل الموعد بيوم. الله يعطيك العافية.',
                        'الله يسلمك.',
                    ],
                    'summary' => 'مكالمة تذكير بموعد يوم الخميس مع طبيب {specialty}، أكّد المريض حضوره.',
                ],
                [
                    'lines' => [
                        'مرحبا {name}، هاي مكالمة تذكير بموعدك بكرا الساعة تسعة مع دكتور {specialty}.',
                        'للأسف ما رح أقدر أجي بكرا، ممكن أأجله؟',
                        'ولا يهمك، عندي فراغ يوم الأحد الجاي الساعة عشرة أو الثلاثاء الساعة اثنين، أيهم بناسبك؟',
                        'الثلاثاء أفضل إلي.',
                        'تمام، أجّلت موعدك ليوم الثلاثاء الساعة اثنين الظهر. في شي ثاني؟',
                        'لا يعطيك العافية.',
                    ],
                    'summary' => 'مكالمة تذكير بموعد تحولت لطلب تأجيل، تم نقل الموعد إلى يوم الثلاثاء الساعة الثانية ظهرًا.',
                ],
            ],
            CallType::Prescription => [
                [
                    'lines' => [
                        'مرحبا فيك بعيادة {clinic}، كيف بقدر أساعدك؟',
                        'بدي أجدد وصفة دوائي، خلص عندي الدواء.',
                        'تمام، ممكن اسمك الكامل واسم الدواء يا ريت؟',
                        'اسمي {name}، الدواء حق ضغط الدم.',
                        'تمام سجلت الطلب يا {name}، رح يراجعه الدكتور وتقدر تستلم الوصفة من الصيدلية خلال يوم أو يومين. بتحتاج شي ثاني؟',
                        'لا هيك تمام، مشكور.',
                    ],
                    'summary' => 'طلب تجديد وصفة دواء لضغط الدم، تم تحويل الطلب للطبيب للمراجعة.',
                ],
                [
                    'lines' => [
                        'أهلين معك المساعد الصوتي، كيف أقدر أخدمك اليوم؟',
                        'بدي أستفسر عن جرعة دوائي، مش متأكد إذا آخده مرتين باليوم ولا مرة.',
                        'هاي المعلومة لازم توصلك من الدكتور مباشرة، بحولك لأقرب موعد متاح مع طبيبك للتأكد.',
                        'تمام يعطيك العافية.',
                    ],
                    'summary' => 'استفسار عن جرعة دواء، تم تحويل المريض للتأكد من الطبيب مباشرة.',
                ],
            ],
            CallType::Insurance => [
                [
                    'lines' => [
                        'مرحبا معك مساعد عيادة {clinic}. كيف بقدر أساعدك؟',
                        'بدي أتأكد إذا تأميني الصحي مقبول عندكم.',
                        'تمام، مين شركة التأمين معك؟',
                        'معي {insurer}.',
                        'خليني أتأكدلك... أيوا نتعامل مع {insurer}. بس خلي في بالك إن التغطية النهائية بترجع لتفاصيل بوليصتك وقت المراجعة.',
                        'تمام يعطيك العافية، هيك بيكفي.',
                    ],
                    'summary' => 'استفسار عن قبول شركة التأمين {insurer}، تم تأكيد التعامل معها مع توضيح أن التغطية النهائية حسب بوليصة المريض.',
                ],
                [
                    'lines' => [
                        'أهلا وسهلا، تفضل كيف أقدر أساعدك؟',
                        'عندي فحص أشعة لازم موافقة مسبقة من التأمين، بدي أعرف وين وصلت الموافقة.',
                        'دقيقة أتأكدلك... الطلب لسا تحت المراجعة عند {insurer}، بنتوقع رد خلال يومين لثلاثة.',
                        'تمام، بتحكوا معي إذا صار في تحديث؟',
                        'أكيد يا {name}، رح نتواصل معك فور ما توصلنا الموافقة.',
                    ],
                    'summary' => 'استفسار عن حالة الموافقة المسبقة لفحص أشعة، ما زالت قيد المراجعة عند {insurer}.',
                ],
            ],
            CallType::Billing => [
                [
                    'lines' => [
                        'مرحبا معك مساعد عيادة {clinic}، كيف بقدر أساعدك؟',
                        'استلمت فاتورة وحاسس إنها أعلى من المتوقع، بدي أفهم ليش.',
                        'يعطيك العافية يا {name}، هاي بحتاج تحويلك لقسم الفوترة عشان يراجعوا التفاصيل معك مباشرة.',
                        'تمام، بتقدر توصلني فيهم هلق؟',
                        'أكيد، ثواني وبحولك.',
                    ],
                    'summary' => 'استفسار حول فاتورة أعلى من المتوقع، تم تحويل المكالمة لقسم الفوترة.',
                ],
                [
                    'lines' => [
                        'أهلين، تفضل كيف بقدر أخدمك؟',
                        'بدي أعرف إذا في خطة تقسيط للفاتورة الأخيرة.',
                        'أيوا متوفر عنا خطط تقسيط، بس هاد القرار لازم يتم من خلال قسم الفوترة مباشرة، رح أسجل طلبك ويتواصلوا معك.',
                        'تمام يعطيك العافية.',
                    ],
                    'summary' => 'طلب خطة تقسيط للفاتورة، تم تسجيل الطلب لمتابعته من قسم الفوترة.',
                ],
            ],
            CallType::FollowUp => [
                [
                    'lines' => [
                        'مرحبا {name}، معك مساعد عيادة {clinic}، بتصل معك للاطمئنان بعد زيارتك الأخيرة لدكتور {specialty}.',
                        'أهلين، الحمدلله تحسنت كثير.',
                        'الحمدلله على السلامة. هل عندك أي أعراض جانبية من الدواء الموصوف؟',
                        'لا ولله، كل شي تمام.',
                        'ممتاز، إذا صار عندك أي استفسار لا تتردد تتصل فينا. دام عليك الصحة والعافية.',
                    ],
                    'summary' => 'مكالمة متابعة بعد الزيارة لدى طبيب {specialty}، المريض أفاد بتحسن الحالة وعدم وجود أعراض جانبية.',
                ],
                [
                    'lines' => [
                        'مرحبا {name}، هاي مكالمة متابعة بخصوص نتائج التحليل الأخير.',
                        'أهلين، طلعت النتائج؟',
                        'الدكتور راجعها وكل شي طبيعي الحمدلله، بس حاب يشوفك بعد شهر للمتابعة الروتينية.',
                        'تمام، بتقدر تحجزلي الموعد هلق؟',
                        'أكيد يا {name}، بقدر أحجزلك هلق إذا بدك.',
                    ],
                    'summary' => 'مكالمة متابعة لنتائج تحاليل طبيعية، تم اقتراح موعد متابعة بعد شهر.',
                ],
            ],
            CallType::Triage => [
                [
                    'lines' => [
                        'مرحبا معك مساعد عيادة {clinic}، شو الأعراض يلي حاسس فيها؟',
                        'حاسس بألم بسيط بمعدتي من الصبح وشوي دوخة.',
                        'خليني أفهم أكتر، الألم شديد ولا بسيط؟ وفي إقياء أو حرارة؟',
                        'لأ ولله بسيط، بس مزعج شوي.',
                        'تمام، بناء على الأعراض هاي مش طارئة، بس بحولك لموعد سريع اليوم مع الممرضة للتأكد.',
                        'تمام يعطيك العافية.',
                    ],
                    'summary' => 'استفسار عن أعراض ألم معدة خفيف ودوخة، تم تحويل المريض لموعد تقييم سريع مع الممرضة.',
                ],
                [
                    'lines' => [
                        'مرحبا معك مساعد عيادة {clinic}، شو ظروفك؟',
                        'حاسس بضيق تنفس وألم بصدري من شوي.',
                        'هاد وضع يحتاج عناية فورية، رح أحولك حالا لطبيب مختص، وإذا زادت الأعراض لا تتردد تتصل بالإسعاف على الرقم 911.',
                        'تمام، بستنى.',
                    ],
                    'summary' => 'بلاغ عن ضيق تنفس وألم صدر، تم التحويل الفوري لطبيب مختص مع نصيحة الاتصال بالإسعاف عند تفاقم الأعراض.',
                ],
            ],
            CallType::General => [
                [
                    'lines' => [
                        'مرحبا فيك بعيادة {clinic}، كيف بقدر أساعدك اليوم؟',
                        'بدي أعرف مواعيد الدوام عندكم.',
                        'دوامنا من الأحد للخميس من الساعة تسعة الصبح لحتى الساعة خمسة العصر، ويوم السبت لحد الساعة وحدة الظهر. الجمعة إجازة.',
                        'تمام يعطيك العافية، هيك بيكفي.',
                    ],
                    'summary' => 'استفسار عام عن مواعيد دوام العيادة.',
                ],
                [
                    'lines' => [
                        'أهلين معك مساعد عيادة {clinic}، تفضل.',
                        'وين موقع العيادة بالضبط؟ تايه شوي.',
                        'احنا بـ{city}، {street}. إذا حابب أبعتلك موقعنا عالخريطة برسالة نصية؟',
                        'أيوا لو سمحت.',
                        'تمام يا {name}، رح توصلك الرسالة هلق.',
                    ],
                    'summary' => 'استفسار عن موقع العيادة، تم إرسال الموقع عبر رسالة نصية.',
                ],
            ],
        };

        $scenario = fake()->randomElement($pool);

        $replacements = [
            '{clinic}' => $clinic->name,
            '{specialty}' => $specialty,
            '{name}' => $callerFirstName,
            '{insurer}' => $insurer,
            '{city}' => $clinic->city,
            '{street}' => $this->jordanianStreetNames[array_rand($this->jordanianStreetNames)],
        ];

        return [
            'lines' => array_map(fn (string $line) => strtr($line, $replacements), $scenario['lines']),
            'summary' => strtr($scenario['summary'], $replacements),
        ];
    }

    /**
     * @param  array<int, string>  $lines
     */
    private function seedTranscripts(Call $call, array $lines): void
    {
        $timestampMs = 0;

        foreach ($lines as $j => $content) {
            CallTranscript::create([
                'call_id' => $call->id,
                'speaker' => $j % 2 === 0 ? CallSpeaker::Ai : CallSpeaker::Patient,
                'content' => $content,
                'timestamp_ms' => $timestampMs,
                'confidence' => fake()->randomFloat(2, 0.85, 0.99),
                'created_at' => $call->started_at,
            ]);
            $timestampMs += fake()->numberBetween(2000, 8000);
        }
    }

    private function seedToolInvocations(Call $call): void
    {
        $toolCount = fake()->numberBetween(0, 3);
        $tools = [CallToolName::LookupPatient, CallToolName::CheckSchedule, CallToolName::BookAppointment, CallToolName::VerifyInsurance];

        for ($j = 0; $j < $toolCount; $j++) {
            CallToolInvocation::create([
                'call_id' => $call->id,
                'tool_name' => fake()->randomElement($tools),
                'input_payload' => ['query' => fake()->word()],
                'output_payload' => ['result' => 'success', 'data' => fake()->sentence()],
                'duration_ms' => fake()->numberBetween(50, 500),
                'success' => fake()->boolean(95),
                'invoked_at' => $call->started_at,
                'created_at' => $call->started_at,
            ]);
        }
    }
}
