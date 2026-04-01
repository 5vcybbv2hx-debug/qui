/**
 * formUtils.jsx
 * Shared React Hook Form + Zod utilities and UI building blocks.
 *
 * Pattern:
 *   const form = useForm({ resolver: zodResolver(MySchema), defaultValues });
 *   <Form form={form} onSubmit={...}>
 *     <Field name="email" label="E-Mail" form={form} />
 *   </Form>
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Controller } from 'react-hook-form';

export { zodResolver };

// ── FieldError — displays RHF error message under a field ─────────────────────
export function FieldError({ error }) {
    if (!error?.message) return null;
    return <p className="text-xs text-destructive mt-1">{error.message}</p>;
}

// ── FieldWrapper — label + children + error in one block ──────────────────────
export function FieldWrapper({ label, required, error, children, className }) {
    return (
        <div className={cn('space-y-1', className)}>
            {label && (
                <Label className={cn(required && "after:content-['*'] after:text-destructive after:ml-0.5")}>
                    {label}
                </Label>
            )}
            {children}
            <FieldError error={error} />
        </div>
    );
}

// ── TextField — controlled Input connected to RHF ─────────────────────────────
export function TextField({ name, label, required, form, type = 'text', placeholder, className, inputProps }) {
    const { register, formState: { errors } } = form;
    return (
        <FieldWrapper label={label} required={required} error={errors[name]} className={className}>
            <Input
                type={type}
                placeholder={placeholder}
                {...register(name)}
                className={cn(errors[name] && 'border-destructive focus-visible:ring-destructive')}
                {...inputProps}
            />
        </FieldWrapper>
    );
}

// ── TextAreaField ─────────────────────────────────────────────────────────────
export function TextAreaField({ name, label, required, form, placeholder, className, rows = 3 }) {
    const { register, formState: { errors } } = form;
    return (
        <FieldWrapper label={label} required={required} error={errors[name]} className={className}>
            <Textarea
                placeholder={placeholder}
                rows={rows}
                {...register(name)}
                className={cn(errors[name] && 'border-destructive focus-visible:ring-destructive')}
            />
        </FieldWrapper>
    );
}

// ── SelectField — RHF-controlled Select (Radix) ───────────────────────────────
export function SelectField({ name, label, required, form, options, placeholder = 'Auswählen…', className }) {
    const { control, formState: { errors } } = form;
    return (
        <FieldWrapper label={label} required={required} error={errors[name]} className={className}>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger className={cn(errors[name] && 'border-destructive')}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            />
        </FieldWrapper>
    );
}

// ── SubmitButton — shows spinner while pending ────────────────────────────────
export function SubmitButton({ children = 'Speichern', isPending, className }) {
    return (
        <Button type="submit" disabled={isPending} className={cn('gap-2', className)}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Speichern…' : children}
        </Button>
    );
}