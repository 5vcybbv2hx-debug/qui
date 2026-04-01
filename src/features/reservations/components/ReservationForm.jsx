/**
 * ReservationForm.jsx
 * Reference implementation: React Hook Form + Zod for reservations.
 * Shows the full pattern — copy this structure for other features.
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ReservationSchema, RESERVATION_DEFAULTS } from '../schemas/reservationSchema';
import { TextField, TextAreaField, SelectField, SubmitButton } from '@/lib/formUtils';
import { Controller } from 'react-hook-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FieldWrapper } from '@/lib/formUtils';

const STATUS_OPTIONS = [
    { value: 'vorgemerkt', label: 'Vorgemerkt' },
    { value: 'bestätigt',  label: 'Bestätigt'  },
    { value: 'storniert',  label: 'Storniert'  },
];
const RECURRING_OPTIONS = [
    { value: 'weekly',    label: 'Wöchentlich'      },
    { value: 'biweekly',  label: 'Alle zwei Wochen' },
    { value: 'monthly',   label: 'Monatlich'        },
];

export default function ReservationForm({ defaultValues, onSubmit, onCancel, isPending }) {
    const form = useForm({
        resolver: zodResolver(ReservationSchema),
        defaultValues: { ...RESERVATION_DEFAULTS, ...defaultValues },
    });

    const isRecurring = form.watch('is_recurring');

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* ── Core fields ──────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <TextField name="customer_name" label="Name"  required form={form} className="col-span-2" placeholder="Gast Name" />
                <TextField name="date"  label="Datum"  required form={form} type="date" />
                <TextField name="time"  label="Uhrzeit" required form={form} type="time" />
                <TextField name="guests" label="Personen" required form={form} type="number" inputProps={{ min: 1 }} />
                <TextField name="table"  label="Tisch" form={form} placeholder="z.B. 5" />
                <TextField name="phone"  label="Telefon" form={form} placeholder="+49 123 456789" />
                <TextField name="email"  label="E-Mail"  form={form} type="email" placeholder="gast@example.de" />
            </div>

            <SelectField name="status" label="Status" form={form} options={STATUS_OPTIONS} />
            <TextAreaField name="notes" label="Notizen" form={form} placeholder="Besondere Wünsche…" />

            {/* ── Recurring toggle ────────────────────────────────────────── */}
            <div className="space-y-3 p-3 rounded-lg bg-secondary/40 border border-border">
                <Controller
                    name="is_recurring"
                    control={form.control}
                    render={({ field }) => (
                        <div className="flex items-center gap-2">
                            <Switch checked={field.value} onCheckedChange={field.onChange} id="is_recurring" />
                            <Label htmlFor="is_recurring">Wiederkehrende Reservierung</Label>
                        </div>
                    )}
                />
                {isRecurring && (
                    <div className="grid grid-cols-2 gap-3">
                        <SelectField name="recurring_pattern"  label="Muster"    required form={form} options={RECURRING_OPTIONS} />
                        <TextField   name="recurring_end_date" label="Enddatum"  required form={form} type="date" />
                    </div>
                )}
            </div>

            {/* ── Actions ─────────────────────────────────────────────────── */}
            <div className="flex justify-end gap-2 pt-2">
                {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Abbrechen</Button>}
                <SubmitButton isPending={isPending} />
            </div>
        </form>
    );
}