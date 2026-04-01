# Form Patterns — Best Practices

## Stack
- **React Hook Form** — form state, validation integration, minimal re-renders
- **Zod** — schema definition, type inference, server-side-compatible validation
- **`src/lib/formUtils.jsx`** — shared field components (TextField, SelectField, …)

## Standard Pattern

```jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MySchema, MY_DEFAULTS } from '../schemas/mySchema';
import { TextField, SelectField, SubmitButton } from '@/lib/formUtils';

export default function MyForm({ defaultValues, onSubmit, onCancel, isPending }) {
    const form = useForm({
        resolver: zodResolver(MySchema),
        defaultValues: { ...MY_DEFAULTS, ...defaultValues },
    });

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <TextField name="title" label="Titel" required form={form} />
            <SubmitButton isPending={isPending} />
        </form>
    );
}
```

## Rules

### 1. Schema = single source of truth
Define required fields, types, min/max, regex, and cross-field refinements in Zod.
Never duplicate validation logic in component code.

### 2. Error messages in German, user-friendly
```ts
z.string().min(2, 'Mind. 2 Zeichen erforderlich')   // ✅
z.string().min(2)                                    // ❌ — Zod default is English
```

### 3. Form components are dumb
`ReservationForm` knows nothing about React Query or services.
The parent passes `onSubmit` and `isPending`:
```jsx
const mutation = useCreateReservation();

<ReservationForm
    onSubmit={(data) => mutation.mutate(data)}
    isPending={mutation.isPending}
/>
```

### 4. Coerce numbers from inputs
HTML inputs always return strings. Use `z.coerce.number()` for numeric fields:
```ts
guests: z.coerce.number().min(1).max(200).int()
```

### 5. Optional fields with empty string fallback
Radix/HTML inputs produce `""` not `undefined`. Use `.optional().or(z.literal(''))`:
```ts
phone: z.string().regex(...).optional().or(z.literal(''))
```

### 6. Cross-field validation with `.refine()`
```ts
ReservationSchema.refine(
    data => !data.is_recurring || !!data.recurring_end_date,
    { message: 'Enddatum erforderlich', path: ['recurring_end_date'] }
)
```

### 7. `SubmitButton` shows pending state
Always use `<SubmitButton isPending={mutation.isPending} />` — never a plain Button for submit.

## Available Field Components

| Component      | Use for                           |
|----------------|-----------------------------------|
| `TextField`    | text, email, number, date, time   |
| `TextAreaField`| multi-line text                   |
| `SelectField`  | Radix Select (controlled)         |
| `FieldWrapper` | custom fields (Switch, Checkbox)  |
| `SubmitButton` | form submission with spinner      |
| `FieldError`   | standalone error under any field  |

## Implemented Schemas

| Feature      | Schema file                              |
|--------------|------------------------------------------|
| Employees    | features/employees/schemas/employeeFormSchema.js |
| Reservations | features/reservations/schemas/reservationSchema.js |
| Recipes      | features/recipes/schemas/recipeSchema.js |
| Settings     | features/settings/schemas/settingsSchema.js |