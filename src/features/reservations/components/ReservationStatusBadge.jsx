/**
 * ReservationStatusBadge.jsx
 * Example of a pure presentational feature component.
 * No data fetching — receives only what it needs to render.
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
    'vorgemerkt': { label: 'Vorgemerkt', className: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
    'bestätigt':  { label: 'Bestätigt',  className: 'bg-green-500/20  text-green-300  border-green-500/30'  },
    'storniert':  { label: 'Storniert',  className: 'bg-red-500/20    text-red-300    border-red-500/30'    },
};

export default function ReservationStatusBadge({ status, className }) {
    const config = STATUS_CONFIG[status] ?? { label: status, className: '' };
    return (
        <Badge
            variant="outline"
            className={cn('text-xs font-medium', config.className, className)}
        >
            {config.label}
        </Badge>
    );
}