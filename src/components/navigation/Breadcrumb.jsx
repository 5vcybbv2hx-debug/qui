import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getBreadcrumbs } from '@/lib/navigationUtils';
import { cn } from '@/lib/utils';

/**
 * Breadcrumb Navigation
 * Zeigt den aktuellen Navigationspfad
 */
export default function Breadcrumb({ currentPath, className = '' }) {
  const breadcrumbs = getBreadcrumbs(currentPath);

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className={cn('flex items-center gap-1 text-sm text-muted-foreground', className)}>
      {breadcrumbs.map((crumb, i) => (
        <div key={crumb.path} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
          
          {i === breadcrumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}