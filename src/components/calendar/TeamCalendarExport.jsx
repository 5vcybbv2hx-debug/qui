import React, { useState } from 'react';
import { Download, FileJson, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import jsPDF from 'jspdf';

export default function TeamCalendarExport({ shifts = [], vacations = [], holidays = [], employees = [] }) {
    const [exporting, setExporting] = useState(false);

    const generateCSV = () => {
        setExporting(true);
        
        const rows = [];
        rows.push(['Typ', 'Datum', 'Mitarbeiter', 'Von', 'Bis', 'Details']);
        
        // Schichten
        shifts.forEach(shift => {
            rows.push([
                'Schicht',
                shift.date,
                shift.employee_name,
                shift.start_time,
                shift.end_time,
                shift.shift_type || ''
            ]);
        });
        
        // Urlaube
        vacations.forEach(vacation => {
            rows.push([
                'Urlaub',
                `${vacation.start_date} bis ${vacation.end_date}`,
                vacation.employee_name,
                '',
                '',
                vacation.reason || ''
            ]);
        });
        
        // Feiertage
        holidays.forEach(holiday => {
            rows.push([
                'Feiertag',
                holiday.date,
                holiday.name,
                '',
                '',
                ''
            ]);
        });
        
        const csv = rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Team-Kalender-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        
        setExporting(false);
    };

    const generatePDF = () => {
        setExporting(true);
        
        const doc = new jsPDF();
        const title = 'Team-Kalender Übersicht';
        const date = format(new Date(), 'dd.MM.yyyy', { locale: de });
        
        // Header
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(10);
        doc.text(`Exportiert am ${date}`, 14, 32);
        
        let yPosition = 42;
        
        // Schichten
        if (shifts.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(200, 100, 0);
            doc.text('SCHICHTEN', 14, yPosition);
            yPosition += 8;
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            
            shifts.slice(0, 15).forEach(shift => {
                if (yPosition > 280) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`${shift.date} | ${shift.employee_name} | ${shift.start_time} - ${shift.end_time}`, 14, yPosition);
                yPosition += 6;
            });
            
            if (shifts.length > 15) {
                yPosition += 4;
                doc.setFontSize(8);
                doc.text(`... und ${shifts.length - 15} weitere Schichten`, 14, yPosition);
                yPosition += 6;
            }
        }
        
        // Urlaube
        if (vacations.length > 0) {
            yPosition += 4;
            doc.setFontSize(12);
            doc.setTextColor(200, 100, 0);
            doc.text('URLAUBE', 14, yPosition);
            yPosition += 8;
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            
            vacations.slice(0, 10).forEach(vacation => {
                if (yPosition > 280) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`${vacation.start_date} bis ${vacation.end_date} | ${vacation.employee_name}`, 14, yPosition);
                yPosition += 6;
            });
        }
        
        // Zusammenfassung
        doc.addPage();
        doc.setFontSize(14);
        doc.text('Zusammenfassung', 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Schichten: ${shifts.length}`, 14, 40);
        doc.text(`Urlaube: ${vacations.length}`, 14, 50);
        doc.text(`Feiertage: ${holidays.length}`, 14, 60);
        doc.text(`Mitarbeiter im Kalender: ${employees.length}`, 14, 70);
        
        doc.save(`Team-Kalender-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        
        setExporting(false);
    };

    return (
        <div className="flex gap-2">
            <Button
                variant="outline"
                onClick={generateCSV}
                disabled={exporting}
                className="border-border/70 text-foreground/75 gap-2"
                title="Als CSV exportieren"
            >
                <FileJson className="w-4 h-4" />
                CSV
            </Button>
            <Button
                variant="outline"
                onClick={generatePDF}
                disabled={exporting}
                className="border-border/70 text-foreground/75 gap-2"
                title="Als PDF exportieren"
            >
                <FileText className="w-4 h-4" />
                PDF
            </Button>
        </div>
    );
}