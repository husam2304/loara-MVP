<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Clinic extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'slug', 'phone', 'email', 'address', 'city', 'state', 'zip_code',
        'latitude', 'longitude', 'timezone', 'logo_url', 'favicon_url', 'website',
        'after_hours_ai_enabled', 'is_enabled', 'is_publicly_listed',
    ];

    protected function casts(): array
    {
        return [
            'after_hours_ai_enabled' => 'boolean',
            'is_enabled' => 'boolean',
            'is_publicly_listed' => 'boolean',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Clinic $clinic) {
            if (! $clinic->slug) {
                $clinic->slug = static::generateUniqueSlug($clinic->name);
            }
        });
    }

    public static function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'clinic';
        $slug = $base;
        $suffix = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    /**
     * Scope a query to only clinics that have opted in to the public directory
     * AND are not disabled by the platform. Both checks are required — a
     * clinic marked publicly_listed but suspended by a SuperAdmin must never
     * surface in the public API.
     */
    public function scopePubliclyVisible($query)
    {
        return $query->where('is_publicly_listed', true)->where('is_enabled', true);
    }

    public function operatingHours(): HasMany
    {
        return $this->hasMany(ClinicOperatingHour::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function providers(): HasMany
    {
        return $this->hasMany(Provider::class);
    }

    public function patients(): HasMany
    {
        return $this->hasMany(Patient::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }

    public function calls(): HasMany
    {
        return $this->hasMany(Call::class);
    }

    public function insuranceProviders(): HasMany
    {
        return $this->hasMany(InsuranceProvider::class);
    }

    public function triageRules(): HasMany
    {
        return $this->hasMany(TriageRule::class);
    }

    public function escalationPaths(): HasMany
    {
        return $this->hasMany(EscalationPath::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function aiConfiguration(): HasOne
    {
        return $this->hasOne(AiConfiguration::class);
    }

    public function aiPrompts(): HasMany
    {
        return $this->hasMany(AiPrompt::class);
    }

    public function integrations(): HasMany
    {
        return $this->hasMany(Integration::class);
    }

    public function gatewayConfigurations(): HasMany
    {
        return $this->hasMany(GatewayConfiguration::class);
    }

    public function subscription(): HasOne
    {
        return $this->hasOne(ClinicSubscription::class)->latestOfMany();
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function usageRecords(): HasMany
    {
        return $this->hasMany(UsageRecord::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function knowledgeBaseFiles(): HasMany
    {
        return $this->hasMany(KnowledgeBaseFile::class);
    }

    public function outboundCampaigns(): HasMany
    {
        return $this->hasMany(OutboundCampaign::class);
    }

    public function reminderSetting(): HasOne
    {
        return $this->hasOne(ClinicReminderSetting::class);
    }

    public function landingPageContent(): HasOne
    {
        return $this->hasOne(LandingPageContent::class);
    }

    public function squadWorkflow(): HasOne
    {
        return $this->hasOne(SquadWorkflow::class);
    }

    public function hasActiveSubscription(): bool
    {
        return $this->subscription?->isActive() ?? false;
    }
}
