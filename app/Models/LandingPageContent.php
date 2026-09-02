<?php

namespace App\Models;

use Database\Factories\LandingPageContentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingPageContent extends Model
{
    /** @use HasFactory<LandingPageContentFactory> */
    use HasFactory;

    protected $fillable = [
        'clinic_id',
        'content',
    ];

    protected function casts(): array
    {
        return [
            'content' => 'array',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /**
     * Return the full content with defaults merged in for any missing keys.
     *
     * @return array<string, mixed>
     */
    public function getResolvedContent(?string $locale = null): array
    {
        $locale ??= app()->getLocale();

        $defaults = static::defaultContent();

        $defaultContent = $defaults[$locale]
            ?? $defaults['en'];

        $savedContent = $this->content[$locale]
            ?? [];

        return array_replace_recursive(
            $defaultContent,
            $savedContent
        );
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultContent(): array
    {
        $appName = config('app.name', 'Loara');

        return [
            'en' => [
                'hero' => [
                    'badge_text' => 'AI Agent Active',
                    'headline_line1' => 'Build Intelligent',
                    'headline_line2' => 'Voice Agents with',
                    'highlight_word' => 'Workflows',
                    'description' => 'From routing to resolution, design adaptive voice agents that automate conversations and integrate with your clinic.',
                    'primary_cta_text' => 'Try Workflows',
                    'secondary_cta_text' => 'Read Documentation',
                    'voice_demo_enabled' => true,
                    'voice_demo_text' => 'Talk to our AI',
                    'trust_badges' => [
                        ['icon' => 'Shield', 'text' => 'HIPAA Compliant'],
                        ['icon' => 'Phone', 'text' => '24/7 Coverage'],
                        ['icon' => 'CheckCircle2', 'text' => 'No Setup Fee'],
                    ],
                ],

                'features' => [
                    'label' => 'Features',
                    'heading' => 'Everything your front desk needs',
                    'description' => 'One AI platform that replaces hold music, missed calls, and manual scheduling.',
                    'items' => [
                        [
                            'icon' => 'Phone',
                            'title' => 'AI Call Handling',
                            'description' => 'Intelligent voice agent answers calls 24/7, schedules appointments, and triages patients automatically.',
                        ],
                        [
                            'icon' => 'Calendar',
                            'title' => 'Smart Scheduling',
                            'description' => 'Real-time availability checks, conflict prevention, and automated reminders for every appointment.',
                        ],
                        [
                            'icon' => 'Stethoscope',
                            'title' => 'Clinical Triage',
                            'description' => 'AI-powered symptom assessment routes patients to the right care level instantly.',
                        ],
                        [
                            'icon' => 'Shield',
                            'title' => 'Insurance Verification',
                            'description' => 'Automated eligibility checks and prior authorization tracking in real time.',
                        ],
                        [
                            'icon' => 'BarChart2',
                            'title' => 'Analytics Dashboard',
                            'description' => 'Track call volumes, resolution rates, patient sentiment, and operational metrics at a glance.',
                        ],
                        [
                            'icon' => 'BookOpen',
                            'title' => 'Knowledge Base',
                            'description' => 'Upload clinic protocols so the AI responds with accurate, clinic-specific information.',
                        ],
                    ],
                ],

                'how_it_works' => [
                    'label' => 'How It Works',
                    'heading' => 'Up and running in minutes',
                    'steps' => [
                        [
                            'number' => '01',
                            'icon' => 'Settings',
                            'title' => 'Configure',
                            'description' => 'Set up your clinic profile, operating hours, and doctor schedules in minutes.',
                        ],
                        [
                            'number' => '02',
                            'icon' => 'Wifi',
                            'title' => 'Connect',
                            'description' => 'Link your phone number and customize the AI voice, language, and triage rules.',
                        ],
                        [
                            'number' => '03',
                            'icon' => 'Zap',
                            'title' => 'Automate',
                            'description' => 'Your AI agent handles calls, books appointments, and escalates when needed.',
                        ],
                    ],
                ],

                'stats' => [
                    'items' => [
                        ['value' => '50K+', 'label' => 'Calls Handled'],
                        ['value' => '98%', 'label' => 'Resolution Rate'],
                        ['value' => '3 min', 'label' => 'Setup Time'],
                        ['value' => '24/7', 'label' => 'Availability'],
                    ],
                ],

                'pricing' => [
                    'label' => 'Pricing',
                    'heading' => 'Simple, transparent pricing',
                    'description' => 'Choose the plan that fits your clinic. No hidden fees, cancel anytime.',
                ],

                'cta' => [
                    'headline' => 'Ready to automate your clinic?',
                    'description' => 'Join clinics that save 20+ staff hours per week with intelligent call automation.',
                    'primary_button_text' => 'Get Started Free',
                    'secondary_button_text' => 'Learn More',
                ],

                'footer' => [
                    'copyright_text' => $appName.'. All rights reserved.',
                    'social_links' => [
                        ['platform' => 'twitter', 'url' => '#'],
                        ['platform' => 'linkedin', 'url' => '#'],
                        ['platform' => 'github', 'url' => '#'],
                    ],
                ],

                'workflows' => [
                    'booking_flow' => [
                        [
                            'type' => 'conversation',
                            'icon' => 'MessageSquare',
                            'title' => 'Conversation',
                            'content' => "I'd like to book a check-up with Dr. Smith this week",
                            'top_label' => 'Global Node',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'Patient verified',
                            'color' => '#22C55E',
                        ],
                        [
                            'type' => 'tool',
                            'icon' => 'CalendarCheck',
                            'title' => 'Tool',
                            'content' => 'Check Schedule — Tue 9 AM, Wed 2 PM, Thu 10 AM',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'Slot confirmed',
                            'color' => '#22D3EE',
                        ],
                        [
                            'type' => 'end_call',
                            'icon' => 'PhoneOff',
                            'title' => 'End Call',
                            'content' => "You're all set! Tuesday at 9 AM with Dr. Smith",
                        ],
                    ],

                    'triage_flow' => [
                        [
                            'type' => 'start',
                            'icon' => 'Headphones',
                            'title' => 'Conversation',
                            'content' => 'Welcome to '.$appName.'! How can I help you today?',
                            'top_label' => 'Start Node',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'Intent recognized',
                            'color' => '#F59E0B',
                        ],
                        [
                            'type' => 'conversation',
                            'icon' => 'MessageSquare',
                            'title' => 'Conversation',
                            'content' => "I've been having chest pain and dizziness since this morning",
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'Urgency: High',
                            'color' => '#EF4444',
                        ],
                        [
                            'type' => 'transfer',
                            'icon' => 'PhoneForwarded',
                            'title' => 'Transfer Call',
                            'content' => 'Connecting you to our on-call nurse right away',
                        ],
                    ],
                ],

                'showcase' => [
                    'label' => 'Product Tour',
                    'heading' => 'See it in action',
                    'description' => 'A complete front desk in one dashboard — calls, scheduling, and AI workflows.',
                    'items' => [
                        [
                            'title' => 'AI Call Center',
                            'description' => 'Watch live calls, review transcripts, and listen to recordings. Every AI action is logged so your team stays in the loop.',
                            'image' => '/images/showcase/call-center.png',
                            'bullets' => [
                                'Live call monitoring',
                                'Searchable transcripts',
                                'Sentiment & resolution tracking',
                            ],
                        ],
                        [
                            'title' => 'Smart Scheduling',
                            'description' => 'The AI books, reschedules, and cancels in real time with double-booking prevention and automated reminders.',
                            'image' => '/images/showcase/appointments.png',
                            'bullets' => [
                                'Day & week views',
                                'Conflict prevention',
                                'Automated reminders',
                            ],
                        ],
                        [
                            'title' => 'Analytics & Insights',
                            'description' => 'See call volume, AI resolution rate, handle time, and patient sentiment at a glance — with CSV export.',
                            'image' => '/images/showcase/analytics.png',
                            'bullets' => [
                                'Real-time metrics',
                                'Call category breakdown',
                                'Exportable reports',
                            ],
                        ],
                    ],
                ],

                'security' => [
                    'label' => 'Security & Compliance',
                    'heading' => 'Built for healthcare data',
                    'description' => 'Patient information is protected at every step, with controls designed around HIPAA workflows.',
                    'items' => [
                        [
                            'icon' => 'Shield',
                            'title' => 'HIPAA-ready',
                            'description' => 'Identity verification, access controls, and a HIPAA mode for the AI agent.',
                        ],
                        [
                            'icon' => 'Lock',
                            'title' => 'Encrypted',
                            'description' => 'Data encrypted in transit and at rest; secrets never exposed to the browser.',
                        ],
                        [
                            'icon' => 'FileText',
                            'title' => 'Audit logging',
                            'description' => 'Every sensitive action is recorded for a complete, reviewable trail.',
                        ],
                        [
                            'icon' => 'CheckCircle2',
                            'title' => 'Verified callers',
                            'description' => 'Date-of-birth verification before any patient data is shared on a call.',
                        ],
                    ],
                ],

                'testimonials' => [
                    'label' => 'Testimonials',
                    'heading' => 'Trusted by busy front desks',
                    'description' => 'Clinics use the AI agent to recover missed calls and free up staff time.',
                    'items' => [
                        [
                            'quote' => 'We stopped losing after-hours calls overnight. The AI books appointments while we sleep.',
                            'name' => 'Dr. Sarah Mitchell',
                            'role' => 'Owner, Westside Family Medical',
                        ],
                        [
                            'quote' => 'Our front desk finally has breathing room. Routine scheduling just handles itself now.',
                            'name' => 'James Carter',
                            'role' => 'Practice Manager, Downtown Pediatrics',
                        ],
                        [
                            'quote' => 'Setup took an afternoon. The triage routing alone paid for itself in the first month.',
                            'name' => 'Dr. Priya Nair',
                            'role' => 'Director, Lakeside Urgent Care',
                        ],
                    ],
                ],

                'faq' => [
                    'label' => 'FAQ',
                    'heading' => 'Frequently asked questions',
                    'description' => 'Everything you need to know before getting started.',
                    'items' => [
                        [
                            'question' => 'Does the AI work 24/7?',
                            'answer' => 'Yes. The voice agent answers calls around the clock, books appointments, and escalates urgent cases to your staff.',
                        ],
                        [
                            'question' => 'Will it integrate with my phone number?',
                            'answer' => 'Yes. Connect a phone number and the AI answers inbound calls and can place outbound reminders and follow-ups.',
                        ],
                        [
                            'question' => 'Is patient data secure?',
                            'answer' => 'Patient identity is verified before any data is shared, sensitive actions are audit-logged, and data is encrypted. The agent includes a HIPAA mode.',
                        ],
                        [
                            'question' => 'How long does setup take?',
                            'answer' => 'Most clinics are live the same day — configure your profile and hours, connect a number, and customize the AI.',
                        ],
                        [
                            'question' => 'Can I cancel anytime?',
                            'answer' => 'Yes. Plans are month-to-month with no long-term contract; cancel from the billing portal whenever you like.',
                        ],
                    ],
                ],
            ],

            'ar' => [
                'hero' => [
                    'badge_text' => 'وكيل الذكاء الاصطناعي نشط',
                    'headline_line1' => 'أنشئ وكلاء صوتيين',
                    'headline_line2' => 'أذكياء باستخدام',
                    'highlight_word' => 'سير العمل',
                    'description' => 'من توجيه المكالمات إلى حل الطلبات، صمّم وكلاء صوتيين متكيفين لأتمتة المحادثات والتكامل مع عيادتك.',
                    'primary_cta_text' => 'جرّب سير العمل',
                    'secondary_cta_text' => 'اقرأ التوثيق',
                    'voice_demo_enabled' => true,
                    'voice_demo_text' => 'تحدث مع الذكاء الاصطناعي',
                    'trust_badges' => [
                        ['icon' => 'Shield', 'text' => 'متوافق مع HIPAA'],
                        ['icon' => 'Phone', 'text' => 'تغطية على مدار الساعة'],
                        ['icon' => 'CheckCircle2', 'text' => 'بدون رسوم إعداد'],
                    ],
                ],

                'features' => [
                    'label' => 'المميزات',
                    'heading' => 'كل ما يحتاجه مكتب الاستقبال',
                    'description' => 'منصة ذكاء اصطناعي واحدة تستبدل الانتظار والمكالمات الفائتة والجدولة اليدوية.',
                    'items' => [
                        [
                            'icon' => 'Phone',
                            'title' => 'إدارة المكالمات بالذكاء الاصطناعي',
                            'description' => 'وكيل صوتي ذكي يجيب على المكالمات على مدار الساعة، ويجدول المواعيد، ويوجه المرضى تلقائياً.',
                        ],
                        [
                            'icon' => 'Calendar',
                            'title' => 'جدولة ذكية',
                            'description' => 'التحقق من المواعيد المتاحة لحظياً، ومنع التعارضات، وإرسال التذكيرات تلقائياً لكل موعد.',
                        ],
                        [
                            'icon' => 'Stethoscope',
                            'title' => 'الفرز الطبي',
                            'description' => 'تقييم الأعراض بالذكاء الاصطناعي وتوجيه المرضى فوراً إلى مستوى الرعاية المناسب.',
                        ],
                        [
                            'icon' => 'Shield',
                            'title' => 'التحقق من التأمين',
                            'description' => 'التحقق التلقائي من أهلية التأمين ومتابعة الموافقات المسبقة بشكل فوري.',
                        ],
                        [
                            'icon' => 'BarChart2',
                            'title' => 'لوحة التحليلات',
                            'description' => 'تابع حجم المكالمات، ومعدلات حل الطلبات، ورضا المرضى، ومؤشرات الأداء التشغيلية بسهولة.',
                        ],
                        [
                            'icon' => 'BookOpen',
                            'title' => 'قاعدة المعرفة',
                            'description' => 'ارفع بروتوكولات العيادة ليقدم الذكاء الاصطناعي إجابات دقيقة ومخصصة لعيادتك.',
                        ],
                    ],
                ],

                'how_it_works' => [
                    'label' => 'كيف يعمل',
                    'heading' => 'جاهز للعمل خلال دقائق',
                    'steps' => [
                        [
                            'number' => '01',
                            'icon' => 'Settings',
                            'title' => 'الإعداد',
                            'description' => 'أعدد ملف عيادتك وساعات العمل وجداول الأطباء خلال دقائق.',
                        ],
                        [
                            'number' => '02',
                            'icon' => 'Wifi',
                            'title' => 'الربط',
                            'description' => 'اربط رقم هاتفك وخصص صوت الذكاء الاصطناعي واللغة وقواعد الفرز الطبي.',
                        ],
                        [
                            'number' => '03',
                            'icon' => 'Zap',
                            'title' => 'الأتمتة',
                            'description' => 'يتولى وكيل الذكاء الاصطناعي المكالمات وحجز المواعيد وتحويل الحالات عند الحاجة.',
                        ],
                    ],
                ],

                'stats' => [
                    'items' => [
                        ['value' => '50K+', 'label' => 'مكالمة تمت معالجتها'],
                        ['value' => '98%', 'label' => 'معدل حل الطلبات'],
                        ['value' => '3 دقائق', 'label' => 'وقت الإعداد'],
                        ['value' => '24/7', 'label' => 'متاح على مدار الساعة'],
                    ],
                ],

                'pricing' => [
                    'label' => 'الأسعار',
                    'heading' => 'أسعار بسيطة وشفافة',
                    'description' => 'اختر الخطة المناسبة لعيادتك. بدون رسوم مخفية، ويمكنك الإلغاء في أي وقت.',
                ],

                'cta' => [
                    'headline' => 'هل أنت مستعد لأتمتة عيادتك؟',
                    'description' => 'انضم إلى العيادات التي توفر أكثر من 20 ساعة عمل أسبوعياً باستخدام أتمتة المكالمات الذكية.',
                    'primary_button_text' => 'ابدأ مجاناً',
                    'secondary_button_text' => 'اعرف المزيد',
                ],

                'footer' => [
                    'copyright_text' => $appName.'. جميع الحقوق محفوظة.',
                    'social_links' => [
                        ['platform' => 'twitter', 'url' => '#'],
                        ['platform' => 'linkedin', 'url' => '#'],
                        ['platform' => 'github', 'url' => '#'],
                    ],
                ],

                'workflows' => [
                    'booking_flow' => [
                        [
                            'type' => 'conversation',
                            'icon' => 'MessageSquare',
                            'title' => 'محادثة',
                            'content' => 'أرغب بحجز موعد للفحص مع الدكتور سمث هذا الأسبوع',
                            'top_label' => 'العقدة العامة',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'تم التحقق من المريض',
                            'color' => '#22C55E',
                        ],
                        [
                            'type' => 'tool',
                            'icon' => 'CalendarCheck',
                            'title' => 'أداة',
                            'content' => 'التحقق من الجدول — الثلاثاء 9 صباحاً، الأربعاء 2 ظهراً، الخميس 10 صباحاً',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'تم تأكيد الموعد',
                            'color' => '#22D3EE',
                        ],
                        [
                            'type' => 'end_call',
                            'icon' => 'PhoneOff',
                            'title' => 'إنهاء المكالمة',
                            'content' => 'تم كل شيء! موعدك يوم الثلاثاء الساعة 9 صباحاً مع الدكتور سمث',
                        ],
                    ],

                    'triage_flow' => [
                        [
                            'type' => 'start',
                            'icon' => 'Headphones',
                            'title' => 'محادثة',
                            'content' => 'أهلاً بك في '.$appName.'! كيف يمكنني مساعدتك اليوم؟',
                            'top_label' => 'عقدة البداية',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'تم تحديد الطلب',
                            'color' => '#F59E0B',
                        ],
                        [
                            'type' => 'conversation',
                            'icon' => 'MessageSquare',
                            'title' => 'محادثة',
                            'content' => 'أعاني من ألم في الصدر ودوخة منذ هذا الصباح',
                        ],
                        [
                            'type' => 'badge',
                            'text' => 'درجة الاستعجال: عالية',
                            'color' => '#EF4444',
                        ],
                        [
                            'type' => 'transfer',
                            'icon' => 'PhoneForwarded',
                            'title' => 'تحويل المكالمة',
                            'content' => 'سأقوم بتحويلك إلى الممرض المناوب فوراً',
                        ],
                    ],
                ],

                'showcase' => [
                    'label' => 'جولة في المنتج',
                    'heading' => 'شاهد النظام أثناء العمل',
                    'description' => 'مكتب استقبال متكامل في لوحة تحكم واحدة — المكالمات والجدولة وسير عمل الذكاء الاصطناعي.',
                    'items' => [
                        [
                            'title' => 'مركز المكالمات بالذكاء الاصطناعي',
                            'description' => 'شاهد المكالمات المباشرة، وراجع النصوص، واستمع إلى التسجيلات. يتم تسجيل كل إجراء للذكاء الاصطناعي حتى يبقى فريقك على اطلاع.',
                            'image' => '/images/showcase/call-center.png',
                            'bullets' => [
                                'مراقبة المكالمات المباشرة',
                                'نصوص قابلة للبحث',
                                'تتبع رضا المرضى ومعدلات حل الطلبات',
                            ],
                        ],
                        [
                            'title' => 'الجدولة الذكية',
                            'description' => 'يقوم الذكاء الاصطناعي بحجز المواعيد وإعادة جدولتها وإلغائها بشكل فوري، مع منع الحجز المزدوج وإرسال التذكيرات تلقائياً.',
                            'image' => '/images/showcase/appointments.png',
                            'bullets' => [
                                'عرض اليوم والأسبوع',
                                'منع التعارضات',
                                'تذكيرات تلقائية',
                            ],
                        ],
                        [
                            'title' => 'التحليلات والرؤى',
                            'description' => 'شاهد حجم المكالمات ومعدل حل الطلبات ومدة المكالمات ورضا المرضى بسهولة، مع إمكانية تصدير البيانات بصيغة CSV.',
                            'image' => '/images/showcase/analytics.png',
                            'bullets' => [
                                'مؤشرات لحظية',
                                'تصنيف المكالمات',
                                'تقارير قابلة للتصدير',
                            ],
                        ],
                    ],
                ],

                'security' => [
                    'label' => 'الأمان والامتثال',
                    'heading' => 'مصمم لحماية البيانات الصحية',
                    'description' => 'تتم حماية معلومات المرضى في كل خطوة، مع ضوابط مصممة وفق إجراءات HIPAA.',
                    'items' => [
                        [
                            'icon' => 'Shield',
                            'title' => 'متوافق مع HIPAA',
                            'description' => 'التحقق من الهوية، وضوابط الوصول، ووضع HIPAA لوكيل الذكاء الاصطناعي.',
                        ],
                        [
                            'icon' => 'Lock',
                            'title' => 'تشفير البيانات',
                            'description' => 'يتم تشفير البيانات أثناء النقل وأثناء التخزين، ولا يتم كشف الأسرار للمتصفح.',
                        ],
                        [
                            'icon' => 'FileText',
                            'title' => 'تسجيل العمليات',
                            'description' => 'يتم تسجيل كل إجراء حساس لإنشاء سجل كامل يمكن مراجعته.',
                        ],
                        [
                            'icon' => 'CheckCircle2',
                            'title' => 'المتصلون الذين تم التحقق منهم',
                            'description' => 'التحقق من تاريخ الميلاد قبل مشاركة أي بيانات خاصة بالمريض أثناء المكالمة.',
                        ],
                    ],
                ],

                'testimonials' => [
                    'label' => 'آراء العملاء',
                    'heading' => 'موثوق به من مكاتب الاستقبال المزدحمة',
                    'description' => 'تستخدم العيادات وكيل الذكاء الاصطناعي لاستعادة المكالمات الفائتة وتوفير وقت الموظفين.',
                    'items' => [
                        [
                            'quote' => 'توقفنا عن فقدان مكالمات ما بعد ساعات العمل. الذكاء الاصطناعي يحجز المواعيد بينما نحن نائمون.',
                            'name' => 'د. سارة ميتشل',
                            'role' => 'المالكة، Westside Family Medical',
                        ],
                        [
                            'quote' => 'أصبح لدى مكتب الاستقبال لدينا وقت ومساحة أكبر للعمل. الجدولة الروتينية أصبحت تتم تلقائياً.',
                            'name' => 'جيمس كارتر',
                            'role' => 'مدير العيادة، Downtown Pediatrics',
                        ],
                        [
                            'quote' => 'استغرق الإعداد فترة بعد الظهر فقط. نظام توجيه الحالات وحده عوّض تكلفته خلال الشهر الأول.',
                            'name' => 'د. بريا ناير',
                            'role' => 'المديرة، Lakeside Urgent Care',
                        ],
                    ],
                ],

                'faq' => [
                    'label' => 'الأسئلة الشائعة',
                    'heading' => 'الأسئلة الأكثر شيوعاً',
                    'description' => 'كل ما تحتاج إلى معرفته قبل البدء.',
                    'items' => [
                        [
                            'question' => 'هل يعمل الذكاء الاصطناعي على مدار الساعة؟',
                            'answer' => 'نعم. يجيب الوكيل الصوتي على المكالمات على مدار الساعة، ويحجز المواعيد، ويحوّل الحالات العاجلة إلى فريقك.',
                        ],
                        [
                            'question' => 'هل يمكن ربطه برقم هاتفي؟',
                            'answer' => 'نعم. اربط رقم هاتف وسيجيب الذكاء الاصطناعي على المكالمات الواردة، ويمكنه إجراء مكالمات تذكيرية ومتابعات صادرة.',
                        ],
                        [
                            'question' => 'هل بيانات المرضى آمنة؟',
                            'answer' => 'يتم التحقق من هوية المريض قبل مشاركة أي بيانات، وتسجيل الإجراءات الحساسة، وتشفير البيانات. كما يتضمن الوكيل وضع HIPAA.',
                        ],
                        [
                            'question' => 'كم يستغرق الإعداد؟',
                            'answer' => 'معظم العيادات تصبح جاهزة للعمل في نفس اليوم — أعدد ملف العيادة وساعات العمل، واربط الرقم، وخصص إعدادات الذكاء الاصطناعي.',
                        ],
                        [
                            'question' => 'هل يمكنني الإلغاء في أي وقت؟',
                            'answer' => 'نعم. الخطط شهرية بدون عقد طويل الأجل، ويمكنك الإلغاء من بوابة الفوترة في أي وقت.',
                        ],
                    ],
                ],
            ],
        ];
    }
}
