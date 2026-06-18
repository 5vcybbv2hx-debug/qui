// Vollständigkeitsprüfung für Mitarbeiter-Personalbögen

// Definiert welche Felder Pflichtfelder sind
const REQUIRED_FIELDS = {
  stammdaten: [
    'name',
    'birthday',
    'nationality'
  ],
  adresse: [
    'street',
    'postal_code',
    'city'
  ],
  kontakt: [
    'phone',
    'email'
  ],
  steuer: [
    'tax_id',
    'health_insurance'
  ],
  bank: [
    'bank_name',
    'iban'
  ],
  notfall: [
    'emergency_contact_name',
    'emergency_contact_phone'
  ]
};

export const SECTIONS = {
  stammdaten: {
    label: 'Stammdaten',
    icon: 'User',
    color: 'blue'
  },
  lohn: {
    label: 'Lohn & Vergütung',
    icon: 'Euro',
    color: 'amber'
  },
  adresse: {
    label: 'Adresse',
    icon: 'MapPin',
    color: 'green'
  },
  kontakt: {
    label: 'Kontaktdaten',
    icon: 'Phone',
    color: 'purple'
  },
  steuer: {
    label: 'Steuer & Sozialversicherung',
    icon: 'FileText',
    color: 'orange'
  },
  bank: {
    label: 'Bankdaten',
    icon: 'CreditCard',
    color: 'pink'
  },
  notfall: {
    label: 'Notfallkontakt',
    icon: 'AlertCircle',
    color: 'red'
  }
};

export function calculateCompletion(employee) {
  if (!employee) return 0;

  let totalFields = 0;
  let completedFields = 0;

  Object.values(REQUIRED_FIELDS).forEach(fields => {
    fields.forEach(field => {
      totalFields++;
      const value = employee[field];
      if (value && value.toString().trim() !== '') {
        completedFields++;
      }
    });
  });

  return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
}

export function getMissingFields(employee) {
  if (!employee) return {};

  const missing = {};

  Object.entries(REQUIRED_FIELDS).forEach(([section, fields]) => {
    const sectionMissing = fields.filter(field => {
      const value = employee[field];
      return !value || value.toString().trim() === '';
    });

    if (sectionMissing.length > 0) {
      missing[section] = sectionMissing;
    }
  });

  // Lohn-Check: jeder aktive Mitarbeiter braucht entweder Stundenlohn oder Festgehalt
  const hasHourly  = employee.hourly_rate  && parseFloat(employee.hourly_rate)  > 0;
  const hasMonthly = employee.monthly_salary && parseFloat(employee.monthly_salary) > 0;
  if (!hasHourly && !hasMonthly && employee.is_active !== false) {
    missing['lohn'] = ['hourly_rate_or_monthly_salary'];
  }

  return missing;
}

export function getSectionCompletion(employee, section) {
  if (!employee) return 0;

  const fields = REQUIRED_FIELDS[section] || [];
  if (fields.length === 0) return 0;

  const completed = fields.filter(field => {
    const value = employee[field];
    return value && value.toString().trim() !== '';
  }).length;

  return Math.round((completed / fields.length) * 100);
}

export function isComplete(employee) {
  const missingFields = getMissingFields(employee);
  return Object.keys(missingFields).length === 0;
}

export function getCompletionStatus(employee) {
  const completion = calculateCompletion(employee);
  
  if (completion === 100) return { status: 'complete', label: 'Vollständig', color: 'green' };
  if (completion >= 75) return { status: 'nearly-complete', label: 'Größtenteils vollständig', color: 'amber' };
  if (completion >= 50) return { status: 'incomplete', label: 'Unvollständig', color: 'orange' };
  return { status: 'mostly-missing', label: 'Zu wenig Informationen', color: 'red' };
}