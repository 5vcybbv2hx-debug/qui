import { z } from 'zod';

/**
 * Common form field validators
 */
export const FormValidation = {
  // Basics
  requiredString: z.string().min(1, 'Erforderlich'),
  optionalString: z.string().optional(),
  email: z.string().email('Ungültige E-Mail'),
  
  // Numbers
  positiveNumber: z.number().positive('Muss positive sein'),
  nonNegativeNumber: z.number().nonnegative('Darf nicht negativ sein'),
  phone: z.string().regex(/^[0-9\s\-\+\(\)]+$/, 'Ungültige Telefonnummer'),
  
  // Dates
  date: z.string().refine((date) => !isNaN(Date.parse(date)), 'Ungültiges Datum'),
  futureDate: z.string().refine(
    (date) => new Date(date) > new Date(),
    'Datum muss in der Zukunft liegen'
  ),
  
  // Urls
  url: z.string().url('Ungültige URL').optional().or(z.literal('')),
  
  // Custom
  barcode: z.string().min(8, 'Barcode zu kurz').max(20, 'Barcode zu lang'),
  iban: z.string().regex(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/, 'Ungültige IBAN'),
  
  // Article
  articleName: z.string().min(2, 'Min. 2 Zeichen').max(100, 'Max. 100 Zeichen'),
  stockQuantity: z.number().nonnegative('Bestand kann nicht negativ sein'),
  price: z.number().positive('Preis muss > 0 sein').or(z.literal(0)),
};

/**
 * Create validated form schema
 */
export const createFormSchema = (fields) => {
  return z.object(fields);
};

/**
 * Validate and catch errors
 */
export const validateForm = async (schema, data) => {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated, errors: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.reduce((acc, err) => {
        const field = err.path.join('.');
        acc[field] = err.message;
        return acc;
      }, {});
      return { success: false, data: null, errors };
    }
    throw error;
  }
};

/**
 * React Hook Form integration
 */
export const getFormFieldError = (errors, field) => {
  const parts = field.split('.');
  let error = errors;
  
  for (const part of parts) {
    if (error?.[part]) {
      error = error[part];
    } else {
      return null;
    }
  }
  
  return error?.message || null;
};