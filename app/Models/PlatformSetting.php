<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class PlatformSetting extends Model
{
    protected $fillable = ['group', 'key', 'value', 'is_encrypted'];

    protected function casts(): array
    {
        return [
            'is_encrypted' => 'boolean',
        ];
    }

    public function getValueAttribute(?string $raw): ?string
    {
        if ($raw && $this->is_encrypted) {
            try {
                return Crypt::decryptString($raw);
            } catch (\Throwable) {
                return null;
            }
        }

        return $raw;
    }

    public function setValueAttribute(?string $value): void
    {
        $this->attributes['value'] = $value && $this->is_encrypted
            ? Crypt::encryptString($value)
            : $value;
    }

    /**
     * Get all settings for a group as key-value array.
     *
     * @return array<string, string|null>
     */
    public static function getGroup(string $group): array
    {
        return static::where('group', $group)
            ->get()
            ->pluck('value', 'key')
            ->toArray();
    }

    /**
     * Set multiple settings for a group at once.
     *
     * @param  array<string, string|null>  $values
     * @param  array<string>  $encrypted  Keys that should be encrypted
     */
    public static function setGroup(string $group, array $values, array $encrypted = []): void
    {
        foreach ($values as $key => $value) {
            $isEncrypted = in_array($key, $encrypted);

            $setting = static::firstOrNew(['group' => $group, 'key' => $key]);
            $setting->is_encrypted = $isEncrypted;
            $setting->value = $value;
            $setting->save();
        }
    }
}
