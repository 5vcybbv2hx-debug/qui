// Shared loading / error / empty helpers for storage tabs

export function LoadingSpinner({ text = 'Lädt…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <div className="w-8 h-8 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorState({ text = 'Fehler beim Laden der Daten.' }) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 text-center text-sm text-destructive font-medium">
      {text}
    </div>
  );
}

export function EmptyState({ text = 'Keine Einträge vorhanden.' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}