/**
 * reservationSchema.js
 * Zod schema for internal reservation create / edit forms.
 * Note: public guest form uses a separate (stricter) schema.
 */
import { z } from 'zod';

export const ReservationSchema = z.object({
    customer_name: z.string().min(2, 'Name muss mind. 2 Zeichen haben').max(100),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: JJJJ-MM-TT'),
    time:          z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
    guests:        z.coerce.number()
                     .min(1, 'Mind. 1 Person')
                     .max(200, 'Max. 200 Personen')
                     .int('Muss eine ganze Zahl sein'),
    phone:         z.string().max(30).optional().or(z.literal('')),
    email:         z.string().email('Gültige E-Mail erforderlich').optional().or(z.literal('')),
    table:         z.string().max(20).optional().or(z.literal('')),
    notes:         z.string().max(500, 'Max. 500 Zeichen').optional().or(z.literal('')),
    status:        z.enum(['vorgemerkt', 'bestätigt', 'storniert']).default('vorgemerkt'),
    source:        z.enum(['intern', 'online']).default('intern'),
    is_recurring:  z.boolean().default(false),
    recurring_pattern: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
    recurring_end_date: z.string()
                         .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: JJJJ-MM-TT')
                         .optional()
                         .or(z.literal('')),
}).refine(
    // Recurring reservations require an end date
    data => !data.is_recurring || !!data.recurring_end_date,
    { message: 'Enddatum erforderlich für Wiederholungen', path: ['recurring_end_date'] }
).refine(
    // Recurring reservations require a pattern
    data => !data.is_recurring || !!data.recurring_pattern,
    { message: 'Wiederholungsmuster erforderlich', path: ['recurring_pattern'] }
);

export const RESERVATION_DEFAULTS = {
    customer_name: '', date: '', time: '', guests: 1,
    phone: '', email: '', table: '', notes: '',
    status: 'vorgemerkt', source: 'intern',
    is_recurring: false, recurring_pattern: undefined, recurring_end_date: '',
};

/** Public guest booking schema — stricter, no internal fields */
export const PublicReservationSchema = z.object({
    customer_name: z.string().min(2, 'Name muss mind. 2 Zeichen haben').max(100),
    email:         z.string().email('Gültige E-Mail erforderlich'),
    phone:         z.string().min(7, 'Telefonnummer erforderlich').max(30),
    date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Ungültiges Datum'),
    time:          z.string().regex(/^\d{2}:\d{2}$/, 'Ungültige Uhrzeit'),
    guests:        z.coerce.number().min(1).max(100).int(),
    notes:         z.string().max(500).optional().or(z.literal('')),
}).refine(
    data => data.date >= new Date().toISOString().split('T')[0],
    { message: 'Datum darf nicht in der Vergangenheit liegen', path: ['date'] }
);