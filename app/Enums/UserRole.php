<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case ClinicOwner = 'clinic_owner';
    case Provider = 'provider';
    case Staff = 'staff';
    case Billing = 'billing';
    case Customer = 'customer';

    public function isClinicStaff(): bool
    {
        return in_array($this, [self::ClinicOwner, self::Provider, self::Staff, self::Billing]);
    }

    public function isSuperAdmin(): bool
    {
        return $this === self::SuperAdmin;
    }

    public function isClinicOwner(): bool
    {
        return $this === self::ClinicOwner;
    }
}
