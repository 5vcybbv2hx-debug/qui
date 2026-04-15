import { AlertCircle, Package } from 'lucide-react';

export function LoadingSpinner({ text = 'Lädt…', size = 'default' }) {
  const sizeClass = size === 'small' ? 'w-6 h-6' : 'w-8 h-8';
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <div className={`${sizeClass} border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin`} />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorState({ text = 'Fehler beim Laden der Daten.', icon: Icon = AlertCircle }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
      <Icon className="w-8 h-8 text-destructive mx-auto" />
      <p className="text-sm text-destructive font-medium">{text}</p>
    </div>
  );
}

export function EmptyState({ text = 'Keine Einträge vorhanden.', icon: Icon = Package }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center space-y-3">
      <Icon className="w-8 h-8 text-muted-foreground mx-auto" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}