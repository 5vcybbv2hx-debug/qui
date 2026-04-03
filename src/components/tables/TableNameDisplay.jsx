import React from 'react';

/**
 * Einheitliche Anzeige des Tischnamens
 * Zeigt preferiert den Tischnamen, mit Fallback auf Tischnummer
 */
export default function TableNameDisplay({ table, showDetails = false, className = '' }) {
    if (!table) return null;

    const displayName = table.name || `Tisch ${table.table_number || table.id}`;

    if (!showDetails) {
        return <span className={className}>{displayName}</span>;
    }

    return (
        <div className={className}>
            <div className="font-semibold text-foreground">{displayName}</div>
            {showDetails && (
                <div className="text-xs text-muted-foreground mt-0.5">
                    {table.room && <div>{table.room}</div>}
                    {table.capacity && <div>{table.capacity} Plätze</div>}
                </div>
            )}
        </div>
    );
}

/**
 * Fallback-Funktion für String-Formate
 * Nutzen in Listings, Dropdowns, etc. wo nur String möglich ist
 */
export function getTableDisplayName(table) {
    if (!table) return '';
    return table.name || `Tisch ${table.table_number || table.id}`;
}