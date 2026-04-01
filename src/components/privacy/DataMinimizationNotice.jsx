import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';

/**
 * DataMinimizationNotice
 * 
 * DSGVO-compliant notices for data collection fields.
 * Shows users what data is collected and why.
 */

export const OptionalFieldNotice = ({ label }) => (
  <div className="text-xs text-muted-foreground italic mt-1">
    Optional – wird nicht für Betrieb erforderlich
  </div>
);

export const RequiredFieldNotice = ({ label, reason }) => (
  <div className="text-xs text-muted-foreground mt-1">
    Erforderlich für: {reason}
  </div>
);

export const DataCollectionBanner = ({ title, items }) => (
  <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 mb-6">
    <Info className="h-4 w-4 text-blue-600" />
    <AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
      <strong>{title}</strong>
      <ul className="mt-2 space-y-1 ml-4 list-disc">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    </AlertDescription>
  </Alert>
);

export const SensitiveDataWarning = ({ fields }) => (
  <Alert className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20">
    <AlertTriangle className="h-4 w-4 text-amber-600" />
    <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
      <strong>Sensible Daten:</strong> {fields.join(', ')} sind besonders geschützt und nur für berechtigte Personen einsehbar.
    </AlertDescription>
  </Alert>
);

export const ConsentCheckbox = ({ checked, onChange, label }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="w-5 h-5 rounded border-slate-300 mt-1 accent-amber-600 cursor-pointer"
    />
    <label className="text-sm text-foreground cursor-pointer">
      {label}
    </label>
  </div>
);