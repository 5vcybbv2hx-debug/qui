import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Druckbereiche und ihre Standard-Formate
 * format: CSS @page size Wert
 */
export const PRINT_AREAS = {
    a4_portrait:  { label: 'A4 Dokumente',    format: 'A4 portrait',   icon: '📄', description: 'Berichte, Listen, PDFs' },
    a4_landscape: { label: 'A4 Querformat',   format: 'A4 landscape',  icon: '📊', description: 'Tabellen, Dienstpläne' },
    label_62:     { label: 'Etiketten 62mm',  format: '62mm 29mm',     icon: '🏷️', description: 'Brother / Dymo Etikettenband' },
    label_a6:     { label: 'Etiketten A6',    format: 'A6 portrait',   icon: '🏷️', description: 'Kleine Aufkleber / Preisschilder' },
    receipt:      { label: 'Bon-Drucker',     format: '80mm auto',     icon: '🧾', description: 'Thermobondrucker 80mm' },
};

/**
 * Druckbereich-Mapping: welche App-Funktion nutzt welches Format
 */
export const AREA_MAPPING = {
    employees:    'a4_portrait',
    shifts:       'a4_landscape',
    recipes:      'a4_portrait',
    articles:     'a4_landscape',
    shopping:     'a4_portrait',
    todos:        'a4_portrait',
    timetracking: 'a4_landscape',
    labels:       'label_62',
    receipts:     'a4_portrait',
    accounting:   'a4_portrait',
    protocol:     'a4_portrait',
};

const DEFAULT_SETTINGS = Object.fromEntries(
    Object.entries(AREA_MAPPING).map(([k, v]) => [k, v])
);

export function usePrintSettings() {
    const queryClient = useQueryClient();

    const { data: companyList } = useQuery({
        queryKey: ['companyInfo'],
        queryFn: () => base44.entities.CompanyInfo.list(),
        staleTime: 5 * 60 * 1000,
    });

    const company = companyList?.[0];

    const settings = useMemo(() => {
        try {
            return company?.print_settings
                ? { ...DEFAULT_SETTINGS, ...JSON.parse(company.print_settings) }
                : { ...DEFAULT_SETTINGS };
        } catch {
            return { ...DEFAULT_SETTINGS };
        }
    }, [company]);

    const saveMutation = useMutation({
        mutationFn: async (newSettings) => {
            const json = JSON.stringify(newSettings);
            if (company?.id) {
                return base44.entities.CompanyInfo.update(company.id, { print_settings: json });
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['companyInfo'] }),
    });

    /**
     * CSS für einen bestimmten App-Bereich injizieren
     * Rufe printWithFormat('shifts') vor window.print() auf
     */
    const printWithFormat = (area) => {
        const areaKey = settings[area] || AREA_MAPPING[area] || 'a4_portrait';
        const format = PRINT_AREAS[areaKey]?.format || 'A4 portrait';

        // Bestehenden Style entfernen
        const existing = document.getElementById('__print_format__');
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = '__print_format__';
        style.textContent = `@media print { @page { size: ${format}; margin: 10mm; } }`;
        document.head.appendChild(style);

        // Nach dem Drucken aufräumen
        setTimeout(() => {
            const el = document.getElementById('__print_format__');
            if (el) el.remove();
        }, 3000);
    };

    return { settings, saveMutation, printWithFormat, PRINT_AREAS, AREA_MAPPING };
}
