import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function PDFExportButton({ 
    data, 
    filename, 
    title, 
    columns,
    formatRow,
    variant = "outline",
    size = "sm",
    className = ""
}) {
    const [isExporting, setIsExporting] = useState(false);

    const exportToPDF = async () => {
        if (!data || data.length === 0) {
            alert('Keine Daten zum Exportieren vorhanden');
            return;
        }

        setIsExporting(true);
        try {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            let yPosition = 20;

            // Titel
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text(title, 15, yPosition);
            yPosition += 10;

            // Datum
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.text(`Erstellt am: ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, 15, yPosition);
            yPosition += 10;

            // Tabellenkopf
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setFillColor(200, 200, 200);
            doc.rect(15, yPosition - 5, pageWidth - 30, 7, 'F');
            
            const colWidth = (pageWidth - 30) / columns.length;
            columns.forEach((col, idx) => {
                doc.text(col.label, 15 + (idx * colWidth) + 2, yPosition);
            });
            yPosition += 10;

            // Daten
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            data.forEach((item, itemIdx) => {
                // Neue Seite wenn nötig
                if (yPosition > pageHeight - 20) {
                    doc.addPage();
                    yPosition = 20;
                }

                const rowData = formatRow ? formatRow(item) : item;
                
                columns.forEach((col, colIdx) => {
                    const value = col.field ? rowData[col.field] : col.render?.(rowData) || '';
                    const text = String(value || '').substring(0, 50); // Max 50 Zeichen
                    doc.text(text, 15 + (colIdx * colWidth) + 2, yPosition);
                });

                yPosition += 7;

                // Trennlinie alle 5 Zeilen
                if ((itemIdx + 1) % 5 === 0) {
                    doc.setDrawColor(220, 220, 220);
                    doc.line(15, yPosition - 2, pageWidth - 15, yPosition - 2);
                }
            });

            // Footer auf jeder Seite
            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text(
                    `Seite ${i} von ${pageCount}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // PDF speichern
            const pdfFilename = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            doc.save(pdfFilename);

        } catch (error) {
            console.error('Fehler beim PDF-Export:', error);
            alert('Fehler beim Erstellen der PDF-Datei');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            onClick={exportToPDF}
            disabled={isExporting || !data || data.length === 0}
            variant={variant}
            size={size}
            className={className}
        >
            {isExporting ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exportiere...
                </>
            ) : (
                <>
                    <FileDown className="w-4 h-4 mr-2" />
                    PDF Export
                </>
            )}
        </Button>
    );
}