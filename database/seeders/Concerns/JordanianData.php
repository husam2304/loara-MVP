<?php

namespace Database\Seeders\Concerns;

/**
 * Shared pool of realistic (fictional) Jordanian names, locations, phone
 * numbers, and medical specialties used across the demo/test seeders so the
 * generated data feels like a real Jordanian clinic rather than a literal
 * translation of the original US-flavored seed data.
 */
trait JordanianData
{
    /**
     * @var array<int, string>
     */
    private array $jordanianMaleFirstNames = [
        'محمد', 'أحمد', 'عمر', 'يزن', 'خالد', 'حمزة', 'مصعب', 'زيد', 'سامر',
        'قصي', 'باسل', 'طارق', 'معاذ', 'إياد', 'نور الدين', 'عبدالله', 'حسين',
        'يوسف', 'مراد', 'كرم', 'وائل', 'فراس', 'رامي', 'أسامة', 'ليث', 'جهاد',
    ];

    /**
     * @var array<int, string>
     */
    private array $jordanianFemaleFirstNames = [
        'نورا', 'ليان', 'سارة', 'رغد', 'دانة', 'ريما', 'هبة', 'لينا', 'رنا',
        'ديما', 'ياسمين', 'شهد', 'جود', 'ملك', 'إسراء', 'روان', 'أسيل',
        'مي', 'لمى', 'تالا', 'زينة', 'غدير', 'سلمى', 'رهف', 'مرام',
    ];

    /**
     * Jordanian family / tribal surnames, spanning different regions.
     *
     * @var array<int, string>
     */
    private array $jordanianFamilyNames = [
        'العجارمة', 'الرواشدة', 'الحياري', 'الزعبي', 'الخطيب', 'الشرايري',
        'العياصرة', 'المجالي', 'الطراونة', 'القضاة', 'الشوابكة', 'الخصاونة',
        'النسور', 'العبداللات', 'بني هاني', 'الزيود', 'العدوان', 'الدعجة',
        'السرحان', 'الفايز', 'العمري', 'حدادين', 'أبو غزلة', 'الكساسبة',
        'الطويسي', 'المومني', 'غرايبة', 'الصمادي', 'بطاينة', 'العتوم',
    ];

    /**
     * Jordanian governorates: Arabic display name, main city, the 2-letter
     * ISO 3166-2:JO subdivision code (fits the existing varchar(2) `state`
     * column), and a plausible 5-digit postal code.
     *
     * @var array<int, array{city: string, state: string, zip: string}>
     */
    private array $jordanianGovernorates = [
        ['city' => 'عمّان', 'state' => 'AM', 'zip' => '11118'],
        ['city' => 'الزرقاء', 'state' => 'AZ', 'zip' => '13110'],
        ['city' => 'إربد', 'state' => 'IR', 'zip' => '21110'],
        ['city' => 'السلط', 'state' => 'BA', 'zip' => '19110'],
        ['city' => 'مادبا', 'state' => 'MD', 'zip' => '17110'],
        ['city' => 'جرش', 'state' => 'JA', 'zip' => '26110'],
        ['city' => 'عجلون', 'state' => 'AJ', 'zip' => '26810'],
        ['city' => 'الكرك', 'state' => 'KA', 'zip' => '61110'],
        ['city' => 'العقبة', 'state' => 'AQ', 'zip' => '77110'],
        ['city' => 'المفرق', 'state' => 'MA', 'zip' => '25110'],
    ];

    /**
     * @var array<int, string>
     */
    private array $jordanianStreetNames = [
        'شارع الملكة رانيا', 'شارع الجامعة', 'شارع مكة', 'شارع وصفي التل',
        'شارع الشريف عبدالحميد شرف', 'شارع عبدالله غوشة', 'شارع المدينة المنورة',
        'شارع الأمير محمد', 'شارع الاستقلال', 'شارع الحرية', 'شارع فلسطين',
        'شارع بلال بن رباح', 'شارع خالد بن الوليد', 'شارع سعد بن أبي وقاص',
    ];

    /** Realistic clinical medical specialties offered in Jordanian clinics. */
    private array $jordanianSpecialties = [
        'طب الأسرة', 'طب الأطفال', 'الأمراض الباطنية', 'طب الأسنان', 'الجلدية',
        'النسائية والتوليد', 'العظام والمفاصل', 'الأنف والأذن والحنجرة',
        'العيون', 'القلب والشرايين', 'المسالك البولية', 'الطب النفسي',
    ];

    private function randomJordanianMaleName(): string
    {
        return $this->jordanianMaleFirstNames[array_rand($this->jordanianMaleFirstNames)]
            .' '.$this->jordanianFamilyNames[array_rand($this->jordanianFamilyNames)];
    }

    private function randomJordanianFemaleName(): string
    {
        return $this->jordanianFemaleFirstNames[array_rand($this->jordanianFemaleFirstNames)]
            .' '.$this->jordanianFamilyNames[array_rand($this->jordanianFamilyNames)];
    }

    private function randomJordanianName(): string
    {
        return random_int(0, 1) === 0
            ? $this->randomJordanianMaleName()
            : $this->randomJordanianFemaleName();
    }

    /**
     * A fictional Jordanian mobile number in the common 07X-XXXXXXX shape
     * (Zain: 077, Umniah: 079, Orange: 078).
     */
    private function randomJordanianMobile(): string
    {
        $prefix = ['077', '078', '079'][array_rand(['077', '078', '079'])];

        return $prefix.str_pad((string) random_int(0, 9999999), 7, '0', STR_PAD_LEFT);
    }

    private function randomGovernorate(): array
    {
        return $this->jordanianGovernorates[array_rand($this->jordanianGovernorates)];
    }

    private function randomJordanianStreetAddress(): string
    {
        $street = $this->jordanianStreetNames[array_rand($this->jordanianStreetNames)];
        $building = random_int(1, 90);

        return "عمارة {$building}، {$street}";
    }
}
