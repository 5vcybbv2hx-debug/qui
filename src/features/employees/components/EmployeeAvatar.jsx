/**
 * EmployeeAvatar.jsx
 * Pure presentational component — displays initials with the employee's color.
 * Zero data fetching, zero business logic.
 */
import { cn } from '@/lib/utils';

function getInitials(name = '') {
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

export default function EmployeeAvatar({ name, color, size = 'md', className }) {
    const sizeClasses = {
        sm:  'w-7 h-7 text-xs',
        md:  'w-9 h-9 text-sm',
        lg:  'w-12 h-12 text-base',
        xl:  'w-16 h-16 text-xl',
    };
    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center font-bold text-white shrink-0',
                sizeClasses[size] ?? sizeClasses.md,
                className
            )}
            style={{ backgroundColor: color || '#64748b' }}
            title={name}
        >
            {getInitials(name)}
        </div>
    );
}