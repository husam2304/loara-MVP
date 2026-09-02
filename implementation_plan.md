# خطة: ربط أفضل نماذج عربية داخل Vapi بأقل من $0.10/دقيقة

## الهدف

إيجاد أفضل تركيبة نماذج **STT + LLM + TTS** من بين النماذج التي يدعمها Vapi، وربطها عبر BYOK (Bring Your Own Key) بحيث:
- ✅ الذكاء الاصطناعي يتحدث عربي بطلاقة وبدون تقطيع
- ✅ سرعة الرد < 800ms (ما يحس العميل بتأخير)
- ✅ التكلفة الإجمالية < $0.10 للدقيقة
- ✅ يبدو بشري بأقصى حد ممكن

---

## كل الخيارات المتاحة داخل Vapi

### 🎙️ STT (تحويل كلام العميل لنص)

| النموذج | دعم العربية | اللهجات | Latency | التكلفة/دقيقة | ملاحظات |
|---------|------------|---------|---------|---------------|---------|
| **Deepgram Nova-3** | ✅ ممتاز | 17 لهجة (خليجي، شامي، مصري، مغربي...) | ~200ms | **$0.0077** | ⭐ الأفضل — يفهم العامية |
| Deepgram Nova-2 | ✅ جيد | أقل لهجات | ~250ms | $0.0059 | أرخص بس أضعف بالعربي |
| OpenAI gpt-4o-transcribe | ✅ جيد | MSA أساساً | ~500-800ms | ~$0.006 | **بطيء** — الحالي عندنا |
| Google Cloud STT | ✅ جيد | عدة لهجات | ~300ms | ~$0.009 | جيد بس مش الأفضل |
| Azure Speech | ✅ جيد | ar-SA, ar-EG | ~300ms | ~$0.008 | ممتاز للفصحى |
| Gladia | ✅ متوسط | MSA | ~400ms | ~$0.01 | يكشف اللغة تلقائي |
| AssemblyAI | ⚠️ محدود | MSA فقط | ~400ms | ~$0.01 | ضعيف بالعربي |

**الفائز: Deepgram Nova-3** — أسرع، أدق، يفهم 17 لهجة عربية، وسعره ممتاز.

---

### 🔊 TTS (تحويل رد الذكاء الاصطناعي لصوت)

| النموذج | دعم العربية | جودة الصوت | Latency | التكلفة التقديرية/دقيقة | ملاحظات |
|---------|------------|-----------|---------|------------------------|---------|
| **Cartesia Sonic** | ✅ ممتاز | طبيعي جداً | **~80ms** | **~$0.006** | ⭐ الأسرع + الأرخص |
| ElevenLabs Flash v2.5 | ✅ ممتاز | عالي جداً | ~75ms | ~$0.013 | جودة ممتازة بس أغلى |
| ElevenLabs Turbo v2.5 | ✅ جيد | عالي | ~150ms | ~$0.013 | قديم — Flash أفضل |
| Azure Neural | ✅ ممتاز | واضح جداً | ~200ms | ~$0.004 | أرخص الكل بس أبطأ |
| PlayHT | ✅ متوسط | جيد | ~300ms | ~$0.01 | بطيء |
| Deepgram Aura-2 | ⚠️ محدود | متوسط | ~150ms | ~$0.005 | العربي ضعيف فيه |
| OpenAI TTS | ✅ جيد | جيد | ~300ms | ~$0.015 | غالي وبطيء |
| Rime AI | ❌ لا يدعم | --- | --- | --- | إنجليزي فقط |

**الأفضل حسب الأولوية:**
- **Cartesia Sonic** — أسرع + أرخص + عربي ممتاز = الخيار الأمثل
- **ElevenLabs Flash v2.5** — جودة أعلى قليلاً بس ضعف السعر
- **Azure Neural** — أرخص الكل بس latency أعلى

---

### 🧠 LLM (الذكاء — يفهم ويرد)

| النموذج | Provider في Vapi | جودة العربية | Function Calling | Latency (TTFT) | التكلفة التقديرية/دقيقة | ملاحظات |
|---------|-----------------|-------------|-----------------|----------------|------------------------|---------|
| **Gemini 2.5 Flash** | google | ⭐ ممتاز | ممتاز | **~100-200ms** | **~$0.002** | ⭐ الأسرع + الأرخص |
| GPT-4o-mini | openai | ممتاز | ممتاز | ~200-300ms | ~$0.003 | ممتاز وسعره حلو |
| GPT-4o | openai | ⭐ ممتاز | ممتاز | ~300-600ms | ~$0.015 | **الحالي** — غالي وأبطأ |
| Claude Sonnet | anthropic | جيد جداً | جيد | ~300ms | ~$0.008 | ممتاز بس مش الأرخص |
| Gemini 2.5 Pro | google | ⭐ ممتاز | ممتاز | ~300ms | ~$0.008 | للمهام المعقدة |
| Groq (Llama 3.1) | groq | متوسط | جيد | ~50ms | ~$0.001 | أسرع شي بس عربيه ضعيف |
| DeepSeek v3 | deepseek | جيد | جيد | ~200ms | ~$0.002 | رخيص بس function calling أضعف |

**الأفضل حسب الأولوية:**
- **Gemini 2.5 Flash** — أسرع + أرخص + عربي ممتاز + function calling قوي
- **GPT-4o-mini** — بديل ممتاز إذا ما بدك تفتح Google API Key
- **GPT-4o** (الحالي) — ممتاز بس أغلى 7x من Gemini Flash بدون فرق يُذكر

---

## التركيبة المثلى المختارة

```
┌─────────────────────────────────────────────────────┐
│              Vapi (Orchestration) — $0.050/min       │
│                                                     │
│   🎙️ STT: Deepgram Nova-3 ──── $0.0077/min         │
│   🧠 LLM: Gemini 2.5 Flash ─── $0.002/min          │
│   🔊 TTS: Cartesia Sonic ───── $0.006/min           │
│                                                     │
│   💰 المجموع: ≈ $0.065/min    ✅ أقل من $0.10      │
└─────────────────────────────────────────────────────┘
```

### مقارنة مع الوضع الحالي

| | الحالي | المقترح | الفرق |
|---|--------|---------|-------|
| **STT** | OpenAI ($0.006) | Deepgram Nova-3 ($0.0077) | +$0.002 بس **أسرع 3x وأدق** |
| **LLM** | GPT-4o ($0.015) | Gemini 2.5 Flash ($0.002) | **-$0.013 توفير 87%** |
| **TTS** | Vapi Voices (مجاني) | Cartesia Sonic ($0.006) | +$0.006 بس **صوت طبيعي** |
| **المجموع** | ~$0.071 | **~$0.065** | **أرخص + أسرع + أفضل عربي** |

> [!NOTE]
> Vapi Voices الحالية مجانية بس **ما تدعم العربي بشكل طبيعي**. لذلك الانتقال لـ Cartesia ضروري لأن الصوت العربي هو الأهم.

---

## التركيبة البديلة (إذا ما بدك Google API Key)

```
STT: Deepgram Nova-3 ——— $0.0077/min
LLM: GPT-4o-mini ——————— $0.003/min  
TTS: Cartesia Sonic ———— $0.006/min
Vapi: ——————————————————— $0.050/min
المجموع: ≈ $0.067/min ✅
```

---

## التغييرات المطلوبة في الكود

### 1. [`VapiService.php`](file:///d:/noktaibtikar/codecanyon-Ez3WkhtB-hiro-aipowered-front-desk-for-healthcare-clinics-saas-application/Hiro/app/Services/VapiService.php)

#### أ) `buildTranscriberConfig()` (السطر 612) — عند العربية → Deepgram Nova-3

```diff
 protected function buildTranscriberConfig(array $config): array
 {
-    $provider = $this->mapTranscriberProvider($config['transcriber_provider'] ?? 'openai');
+    // Auto-select Deepgram Nova-3 for Arabic (best dialect support)
+    $defaultProvider = ($config['language'] ?? 'en') === 'ar' ? 'deepgram' : 'openai';
+    $provider = $this->mapTranscriberProvider($config['transcriber_provider'] ?? $defaultProvider);
     $language = $config['language'] ?? 'en';
 
     $transcriber = [
         'provider' => $provider,
         'language' => $language,
     ];
 
     if (! empty($config['transcriber_model'])) {
         $transcriber['model'] = $config['transcriber_model'];
     } elseif ($provider === 'openai') {
         $transcriber['model'] = 'gpt-4o-transcribe';
+    } elseif ($provider === 'deepgram') {
+        $transcriber['model'] = 'nova-3';
     }
```

#### ب) `buildSystemPrompt()` (السطر 464) — إصلاح Bug

```diff
-    protected function buildSystemPrompt(?string $customPrompt, string $clinicName): string
+    protected function buildSystemPrompt(?string $customPrompt, string $clinicName, string $language = 'en'): string
     {
-        $language = $config['language'] ?? 'en';  // ← Bug: $config غير موجود هنا
         $promptFile = $language === 'ar' ? 'agent-base-ar.md' : 'agent-base.md';
```

#### ج) `buildAssistantPayload()` (السطر 526) — تمرير اللغة

```diff
         'messages' => [
             [
                 'role' => 'system',
-                'content' => $this->buildSystemPrompt($config['system_prompt'] ?? null, $clinicName),
+                'content' => $this->buildSystemPrompt(
+                    $config['system_prompt'] ?? null,
+                    $clinicName,
+                    $config['language'] ?? 'en',
+                ),
             ],
         ],
```

---

### 2. [`agent-base-ar.md`](file:///d:/noktaibtikar/codecanyon-Ez3WkhtB-hiro-aipowered-front-desk-for-healthcare-clinics-saas-application/Hiro/resources/prompts/agent-base-ar.md)

إضافة هذه الأقسام في بداية الملف (قبل السطر الأول):

```markdown
## أسلوب الكلام (مهم جداً — يخلي الصوت طبيعي)

- تحدث بجمل قصيرة ما تتجاوز 12 كلمة.
- استخدم لغة ودودة وطبيعية، مش أسلوب كتابي رسمي.
- ابدأ ردودك أحياناً بـ: "آه"، "تمام"، "طبعاً"، "واضح" — بدل "نعم، يسعدني..."
- إذا تحتاج ثانية للبحث، قل: "لحظة وحدة.." — ولا تصمت فجأة.
- اكتب الأرقام بالكلمات: "الساعة العاشرة صباحاً" بدل "10:00 AM".
- اكتب التواريخ بالكلمات: "يوم الثلاثاء السابع والعشرين" بدل "27/8".

## عبارات محظورة تماماً (تكشف إنك آلة)

- "يسعدني مساعدتك" / "يشرفني"
- "كيف يمكنني مساعدتك اليوم؟"
- "شكراً لاتصالك بـ..."
- "هل هناك شيء آخر يمكنني مساعدتك به؟"
- "بناءً على المعلومات المتاحة لديّ..."
- "كمساعد ذكاء اصطناعي..."

## التعامل مع اللهجات

- إذا تحدث المتصل بلهجة خليجية، انسجم معها.
- إذا تحدث بلهجة شامية، ردّ بنفس الأسلوب.
- لا تصحح لغة المتصل ولا تتحول فجأة لأسلوب رسمي.
```

---

## الإعدادات المطلوبة في Vapi Dashboard

بعد تطبيق تغييرات الكود، لازم تضيف API Keys في Vapi Dashboard:

1. **Deepgram API Key** → [deepgram.com/keys](https://console.deepgram.com) → حساب مجاني يعطيك $200 رصيد
2. **Cartesia API Key** → [cartesia.ai](https://play.cartesia.ai) → حساب تجريبي مجاني
3. **Google API Key** (إذا اخترت Gemini Flash) → [Google AI Studio](https://aistudio.google.com)

ثم في إعدادات العيادة:
- `language` = `ar`
- `transcriber_provider` = `deepgram` (أو يتعيّن تلقائي)
- `voice_provider` = `cartesia`
- `voice_id` = [صوت عربي من Cartesia]
- `model_provider` = `google` + `model` = `gemini-2.5-flash`

---

## خطة التحقق

### اختبارات تلقائية
```bash
php artisan test --compact --filter=VapiServiceToolsTest
php artisan test --compact --filter=VapiWebhookControllerTest
```

### اختبار يدوي
- مكالمة تجريبية بالعربي العامي → التأكد إنه يفهم ويرد بسلاسة
- قياس زمن الرد (لازم أقل من 800ms)
- مقارنة الصوت الحالي مع الصوت الجديد (Cartesia)
