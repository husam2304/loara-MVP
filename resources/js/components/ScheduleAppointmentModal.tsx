import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { Loader2, CalendarPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import type { Patient, Provider, AppointmentType } from '@/types';

interface ScheduleAppointmentModalProps {
    open: boolean;
    onClose: () => void;
    patient: Patient;
    providers: Pick<Provider, 'id' | 'first_name' | 'last_name' | 'title' | 'specialty'>[];
    appointmentTypes: Pick<AppointmentType, 'id' | 'name' | 'duration_minutes'>[];
}

const inputClass =
    'h-10 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]';
const labelClass = 'font-mono text-[11px] font-medium text-[var(--muted-foreground)]';

export function ScheduleAppointmentModal({ open, onClose, patient, providers, appointmentTypes }: ScheduleAppointmentModalProps) {
    const { t } = useTranslation('appointments');
    const tr = (key: string, opts?: Record<string, unknown>) => t(`modals.scheduleFromPatient.${key}`, opts as never);

    const ROOM_OPTIONS = [
        tr('rooms.roomA'), tr('rooms.roomB'), tr('rooms.roomC'),
        tr('rooms.roomD'), tr('rooms.exam1'), tr('rooms.exam2'),
    ];

    const form = useForm({
        patient_id: patient.id,
        provider_id: '',
        appointment_type_id: '',
        scheduled_at: '',
        room: '',
        reason: '',
        notes: '',
    });

    function handleSubmit(e: FormEvent) {
        e.preventDefault();
        form.post('/appointments', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('provider_id', 'appointment_type_id', 'scheduled_at', 'room', 'reason', 'notes');
                onClose();
            },
        });
    }

    const selectedType = appointmentTypes.find((t) => t.id === Number(form.data.appointment_type_id));

    return (
        <Modal open={open} onClose={onClose} title={tr('title')}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Patient (read-only) */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('patient')}</label>
                    <div className="flex h-10 items-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3">
                        <span className="font-primary text-[13px] text-[var(--foreground)]">
                            {patient.first_name} {patient.last_name}
                        </span>
                    </div>
                </div>

                {/* Doctor */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('doctor')}</label>
                    <select
                        value={form.data.provider_id}
                        onChange={(e) => form.setData('provider_id', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{tr('selectDoctor')}</option>
                        {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.title} {p.first_name} {p.last_name} — {p.specialty}
                            </option>
                        ))}
                    </select>
                    {form.errors.provider_id && <p className="font-primary text-[11px] text-red-400">{form.errors.provider_id}</p>}
                </div>

                {/* Appointment Type */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('appointmentType')}</label>
                    <select
                        value={form.data.appointment_type_id}
                        onChange={(e) => form.setData('appointment_type_id', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{tr('selectType')}</option>
                        {appointmentTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name} ({type.duration_minutes} {tr('minSuffix')})
                            </option>
                        ))}
                    </select>
                    {form.errors.appointment_type_id && (
                        <p className="font-primary text-[11px] text-red-400">{form.errors.appointment_type_id}</p>
                    )}
                </div>

                {/* Date & Time */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>
                        {tr('dateTime')}
                        {selectedType && (
                            <span className="ms-2 text-[var(--primary)]">({selectedType.duration_minutes} {tr('minSuffix')})</span>
                        )}
                    </label>
                    <input
                        type="datetime-local"
                        value={form.data.scheduled_at}
                        onChange={(e) => form.setData('scheduled_at', e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className={inputClass}
                    />
                    {form.errors.scheduled_at && <p className="font-primary text-[11px] text-red-400">{form.errors.scheduled_at}</p>}
                </div>

                {/* Room */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('room')}</label>
                    <select
                        value={form.data.room}
                        onChange={(e) => form.setData('room', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">{tr('selectRoom')}</option>
                        {ROOM_OPTIONS.map((room) => (
                            <option key={room} value={room}>{room}</option>
                        ))}
                    </select>
                </div>

                {/* Reason */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('reason')}</label>
                    <input
                        type="text"
                        value={form.data.reason}
                        onChange={(e) => form.setData('reason', e.target.value)}
                        placeholder={tr('reasonPlaceholder')}
                        className={inputClass}
                    />
                    {form.errors.reason && <p className="font-primary text-[11px] text-red-400">{form.errors.reason}</p>}
                </div>

                {/* Notes */}
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{tr('notes')}</label>
                    <textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={2}
                        placeholder={tr('notesPlaceholder')}
                        className="resize-none rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--secondary)] px-3 py-2.5 font-primary text-[13px] text-[var(--foreground)] placeholder-[#52525B] outline-none transition-colors focus:border-[var(--primary)]"
                    />
                    {form.errors.notes && <p className="font-primary text-[11px] text-red-400">{form.errors.notes}</p>}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={form.processing || !form.data.provider_id || !form.data.appointment_type_id || !form.data.scheduled_at}
                    className="mt-1 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--primary)] px-4 py-2.5 font-primary text-[13px] font-medium text-[var(--primary-foreground)] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {form.processing ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            {tr('scheduling')}
                        </>
                    ) : (
                        <>
                            <CalendarPlus size={14} />
                            {tr('scheduleAppointment')}
                        </>
                    )}
                </button>
            </form>
        </Modal>
    );
}
