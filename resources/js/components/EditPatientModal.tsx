import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { Loader2, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import type { Patient } from '@/types';

interface EditPatientModalProps {
    open: boolean;
    onClose: () => void;
    patient: Patient;
}

const inputClass =
    'h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]';
const labelClass = 'font-mono text-[11px] font-medium text-[var(--muted-foreground)]';

export function EditPatientModal({ open, onClose, patient }: EditPatientModalProps) {
    const { t } = useTranslation('patients');

    const GENDER_OPTIONS = [
        { value: 'male', label: t('genders.male') },
        { value: 'female', label: t('genders.female') },
        { value: 'other', label: t('genders.other') },
        { value: 'prefer_not_to_say', label: t('genders.prefer_not_to_say') },
    ];

    const STATUS_OPTIONS = [
        { value: 'active', label: t('status.active') },
        { value: 'inactive', label: t('status.inactive') },
        { value: 'deceased', label: t('status.deceased') },
    ];

    const LANGUAGE_OPTIONS = [
        { value: 'en', label: t('languages.en') },
        { value: 'es', label: t('languages.es') },
        { value: 'zh', label: t('languages.zh') },
        { value: 'vi', label: t('languages.vi') },
    ];

    const form = useForm({
        first_name: patient.first_name,
        last_name: patient.last_name,
        date_of_birth: patient.date_of_birth?.split('T')[0] ?? '',
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email ?? '',
        address: patient.address ?? '',
        city: patient.city ?? '',
        state: patient.state ?? '',
        zip_code: patient.zip_code ?? '',
        emergency_contact_name: patient.emergency_contact_name ?? '',
        emergency_contact_phone: patient.emergency_contact_phone ?? '',
        preferred_language: patient.preferred_language,
        status: patient.status,
        notes: patient.notes ?? '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.patch(`/patients/${patient.id}`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    }

    return (
        <Modal open={open} onClose={onClose} title={t('modals.editTitle')}>
            <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pe-1">
                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.firstName')}</label>
                        <input
                            type="text"
                            value={form.data.first_name}
                            onChange={(e) => form.setData('first_name', e.target.value)}
                            className={inputClass}
                        />
                        {form.errors.first_name && <p className="font-primary text-[11px] text-red-400">{form.errors.first_name}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.lastName')}</label>
                        <input
                            type="text"
                            value={form.data.last_name}
                            onChange={(e) => form.setData('last_name', e.target.value)}
                            className={inputClass}
                        />
                        {form.errors.last_name && <p className="font-primary text-[11px] text-red-400">{form.errors.last_name}</p>}
                    </div>
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.dateOfBirth')}</label>
                        <input
                            type="date"
                            value={form.data.date_of_birth}
                            onChange={(e) => form.setData('date_of_birth', e.target.value)}
                            className={inputClass}
                        />
                        {form.errors.date_of_birth && <p className="font-primary text-[11px] text-red-400">{form.errors.date_of_birth}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.gender')}</label>
                        <select
                            value={form.data.gender}
                            onChange={(e) => form.setData('gender', e.target.value as Patient['gender'])}
                            className={inputClass}
                        >
                            {GENDER_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {form.errors.gender && <p className="font-primary text-[11px] text-red-400">{form.errors.gender}</p>}
                    </div>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.phone')}</label>
                        <input
                            type="tel"
                            value={form.data.phone}
                            onChange={(e) => form.setData('phone', e.target.value)}
                            className={inputClass}
                        />
                        {form.errors.phone && <p className="font-primary text-[11px] text-red-400">{form.errors.phone}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.email')}</label>
                        <input
                            type="email"
                            value={form.data.email}
                            onChange={(e) => form.setData('email', e.target.value)}
                            className={inputClass}
                        />
                        {form.errors.email && <p className="font-primary text-[11px] text-red-400">{form.errors.email}</p>}
                    </div>
                </div>

                {/* Address */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{t('form.address')}</label>
                    <input
                        type="text"
                        value={form.data.address}
                        onChange={(e) => form.setData('address', e.target.value)}
                        className={inputClass}
                    />
                    {form.errors.address && <p className="font-primary text-[11px] text-red-400">{form.errors.address}</p>}
                </div>

                {/* City, State, Zip */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.city')}</label>
                        <input
                            type="text"
                            value={form.data.city}
                            onChange={(e) => form.setData('city', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.state')}</label>
                        <input
                            type="text"
                            value={form.data.state}
                            onChange={(e) => form.setData('state', e.target.value)}
                            maxLength={2}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.zipCode')}</label>
                        <input
                            type="text"
                            value={form.data.zip_code}
                            onChange={(e) => form.setData('zip_code', e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Emergency Contact */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.emergencyContact')}</label>
                        <input
                            type="text"
                            value={form.data.emergency_contact_name}
                            onChange={(e) => form.setData('emergency_contact_name', e.target.value)}
                            placeholder={t('form.emergencyContactPlaceholder')}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.emergencyPhone')}</label>
                        <input
                            type="tel"
                            value={form.data.emergency_contact_phone}
                            onChange={(e) => form.setData('emergency_contact_phone', e.target.value)}
                            placeholder={t('form.emergencyPhonePlaceholder')}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Language & Status */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.language')}</label>
                        <select
                            value={form.data.preferred_language}
                            onChange={(e) => form.setData('preferred_language', e.target.value)}
                            className={inputClass}
                        >
                            {LANGUAGE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>{t('form.status')}</label>
                        <select
                            value={form.data.status}
                            onChange={(e) => form.setData('status', e.target.value as Patient['status'])}
                            className={inputClass}
                        >
                            {STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{t('form.notes')}</label>
                    <textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={3}
                        className="resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]"
                    />
                    {form.errors.notes && <p className="font-primary text-[11px] text-red-400">{form.errors.notes}</p>}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={form.processing}
                    className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {form.processing ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            {t('modals.saving')}
                        </>
                    ) : (
                        <>
                            <Save size={14} />
                            {t('modals.saveChanges')}
                        </>
                    )}
                </button>
            </form>
        </Modal>
    );
}
