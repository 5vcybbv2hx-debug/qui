import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { jsPDF } from 'jspdf';
import haptics from '@/components/utils/haptics';

export function UniversalExport({ 
    data, 
    filename, 
    title,
    columns,
    variant = "outline",
    size = "default"
}) {
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = () => {
        if (!data || data.length === 0) return;
        
        haptics.light();
        setIsExporting(true);

        try {
            const headers = columns.map(col => col.label).join(',');
            const rows = data.map(item => 
                columns.map(col => {
                    const value = col.format ? col.format(item) : item[col.key];
                    return `"${String(value || '').replace(/"/g, '""')}"`;
                }).join(',')
            );

            const csv = [headers, ...rows].join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            haptics.success();
        } catch (error) {
            console.error('CSV Export Error:', error);
            haptics.error();
        } finally {
            setIsExporting(false);
        }
    };

    const exportToPDF = () => {
        if (!data || data.length === 0) return;
        
        haptics.light();
        setIsExporting(true);

        try {
            const doc = new jsPDF('l', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;

            // Title
            doc.setFontSize(18);
            doc.text(title, margin, yPosition);
            yPosition += 10;

            // Date
            doc.setFontSize(10);
            doc.text(`Exportiert am: ${new Date().toLocaleDateString('de-DE')}`, margin, yPosition);
            yPosition += 15;

            // Table
            const colWidths = columns.map(() => (pageWidth - 2 * margin) / columns.length);
            
            // Headers
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            columns.forEach((col, i) => {
                const xPos = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                doc.text(col.label, xPos, yPosition);
            });
            yPosition += 7;

            // Data rows
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            
            data.forEach((item, rowIndex) => {
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = margin;
                }

                columns.forEach((col, i) => {
                    const xPos = margin + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
                    const value = col.format ? col.format(item) : item[col.key];
                    doc.text(String(value || ''), xPos, yPosition);
                });
                yPosition += 7;
            });

            doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
            haptics.success();
        } catch (error) {
            console.error('PDF Export Error:', error);
            haptics.error();
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} size={size} disabled={isExporting}>
                    <Download className="w-4 h-4 mr-2" />
                    {isExporting ? 'Exportiere...' : 'Export'}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Als CSV exportieren
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF}>
                    <FileText className="w-4 h-4 mr-2" />
                    Als PDF exportieren
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}