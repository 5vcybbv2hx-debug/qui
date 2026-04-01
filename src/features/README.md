# Feature Architecture

## Folder Structure

```
src/
├── lib/
│   └── serviceBase.js          # Single base44 access point — import here, nowhere else
│
├── features/
│   └── <feature>/
│       ├── components/         # Presentational & container components for this feature
│       ├── hooks/              # React Query hooks (use<Feature>.js)
│       ├── services/           # Data access + pure business logic
│       ├── schemas/            # Form defaults, enums, validation constants
│       └── utils/              # Feature-specific pure utility functions
│
└── pages/                      # Thin orchestration layer — compose feature pieces
```

## Rules

### 1. Data flows in one direction
```
Page
 └─ Hook (React Query)
     └─ Service (base44 calls)
         └─ serviceBase (single import point)
```
**Never** call `base44.entities` or `base44.functions` directly from a component or page.

### 2. Business logic belongs in services
Calculations (cost, margins, hours, ArbZG checks) live in `services/`.
Hooks import them and expose memoised results.
JSX only receives ready-to-render values.

### 3. Components are dumb or smart — not both
- **Presentational** (`components/`): receive props, render UI, fire callbacks.
- **Container / hook-connected**: call ONE hook, map data to presentational children.

### 4. Query keys are co-located with hooks
Each `hooks/` file exports a `<FEATURE>_KEYS` object.
Mutations invalidate via those keys — no string duplication.

### 5. Pages are thin orchestrators
```jsx
// ✅ Good — page composes features
export default function ReservationsPage() {
  const { data } = useReservations();
  const confirm  = useConfirmReservation();
  return <ReservationList items={data} onConfirm={confirm.mutate} />;
}

// ❌ Bad — business logic in JSX
export default function ReservationsPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { base44.entities.Reservation.list().then(setItems); }, []);
  // ...
}
```

## Implemented Features

| Feature | Service | Hook | Components |
|---------|---------|------|------------|
| Employees | ✅ employeeService.js | ✅ useEmployees.js | ✅ EmployeeAvatar |
| Recipes | ✅ recipeService.js | ✅ useRecipes.js | — |
| TimeTracking | ✅ timeTrackingService.js | ✅ useTimeTracking.js | — |
| Reservations | ✅ reservationService.js | ✅ useReservations.js | ✅ ReservationCard, ReservationStatusBadge |

## Migration Strategy (existing pages)

1. Create service + hook for the feature.
2. Replace `base44.entities.*` calls in the page with the new hook.
3. Extract repeated JSX blocks into components in `features/<feature>/components/`.
4. Move inline calculations to `services/<feature>Service.js`.
5. Delete the dead code from the page.

Migrate one page at a time — the old code and new structure coexist safely.