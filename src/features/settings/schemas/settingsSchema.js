/**
 * settingsSchema.js
 * Zod schemas for Settings and CompanyInfo forms.
 */
import { z } from 'zod';

export const CompanyInfoSchema = z.object({
    name:         z.string().min(2, 'Firmenname erforderlich').max(100),
    address:      z.string().max(200).optional().or(z.literal('')),
    postal_code:  z.string().regex(/^\d{5}$/, 'PLZ muss 5 Ziffern haben').optional().or(z.literal('')),
    city:         z.string().max(100).optional().or(z.literal('')),
    phone:        z.string().max(30).optional().or(z.literal('')),
    email:        z.string().email('Gültige E-Mail').optional().or(z.literal('')),
    website:      z.string().url('Gültige URL (https://…)').optional().or(z.literal('')),
    tax_number:   z.string().max(30).optional().or(z.literal('')),
    logo_url:     z.string().url('Gültige URL').optional().or(z.literal('')),
    description:  z.string().max(1000).optional().or(z.literal('')),
});

export const OpeningHoursSchema = z.object({
    day_of_week:  z.enum(['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag']),
    is_closed:    z.boolean().default(false),
    open_time:    z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional().or(z.literal('')),
    close_time:   z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM').optional().or(z.literal('')),
}).refine(
    data => data.is_closed || (!!data.open_time && !!data.close_time),
    { message: 'Öffnungs- und Schließzeit erforderlich', path: ['open_time'] }
);

export const COMPANY_DEFAULTS = {
    name: '', address: '', postal_code: '', city: '',
    phone: '', email: '', website: '', tax_number: '',
    logo_url: '', description: '',
};