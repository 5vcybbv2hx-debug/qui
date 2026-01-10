import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.1';
import * as XLSX from 'npm:xlsx@0.18.5';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { month, year, format = 'pdf' } = await req.json();

        if (!month || !year) {
            return Response.json({ error: 'Month and year are required' }, { status: 400 });
        }

        // Fetch time entries for the month
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
        
        const allEntries = await base44.entities.TimeEntry.list('-date');
        const entries = allEntries.filter(e => e.date >= startDate && e.date <= endDate);

        // Fetch employees
        const employees = await base44.entities.Employee.filter({ is_active: true });

        // Group by employee
        const employeeData = {};
        employees.forEach(emp => {
            const empEntries = entries.filter(e => e.employee_id === emp.id);
            if (empEntries.length > 0) {
                const totalHours = empEntries.reduce((sum, e) => sum + (e.total_hours || 0), 0);
                const approvedHours = empEntries.filter(e => e.status === 'genehmigt').reduce((sum, e) => sum + (e.total_hours || 0), 0);
                
                employeeData[emp.id] = {
                    name: emp.name,
                    employee_number: emp.employee_number || '-',
                    hourly_rate: emp.hourly_rate || 0,
                    entries: empEntries.sort((a, b) => a.date.localeCompare(b.date)),
                    totalHours: totalHours,
                    approvedHours: approvedHours,
                    totalCost: approvedHours * (emp.hourly_rate || 0)
                };
            }
        });

        const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
        const monthName = monthNames[month - 1];

        if (format === 'pdf') {
            return generatePDF(employeeData, monthName, year);
        } else if (format === 'excel') {
            return generateExcel(employeeData, monthName, year);
        } else {
            return Response.json({ error: 'Invalid format' }, { status: 400 });
        }

    } catch (error) {
        console.error('Error generating report:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function generatePDF(employeeData, monthName, year) {
    const doc = new jsPDF();
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.text(`Zeiterfassungsbericht ${monthName} ${year}`, 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.text(`Erstellt am: ${new Date().toLocaleDateString('de-DE')}`, 20, y);
    y += 15;

    // Summary
    const totalHours = Object.values(employeeData).reduce((sum, emp) => sum + emp.approvedHours, 0);
    const totalCost = Object.values(employeeData).reduce((sum, emp) => sum + emp.totalCost, 0);
    
    doc.setFontSize(12);
    doc.text('Zusammenfassung:', 20, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Gesamtstunden (genehmigt): ${totalHours.toFixed(2)}h`, 25, y);
    y += 6;
    doc.text(`Gesamtkosten: ${totalCost.toFixed(2)}€`, 25, y);
    y += 6;
    doc.text(`Anzahl Mitarbeiter: ${Object.keys(employeeData).length}`, 25, y);
    y += 15;

    // Employee Details
    Object.values(employeeData).forEach(emp => {
        if (y > 270) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`${emp.name} (${emp.employee_number})`, 20, y);
        doc.setFont(undefined, 'normal');
        y += 7;

        doc.setFontSize(9);
        doc.text(`Stundensatz: ${emp.hourly_rate.toFixed(2)}€`, 25, y);
        y += 5;
        doc.text(`Stunden (gesamt): ${emp.totalHours.toFixed(2)}h`, 25, y);
        y += 5;
        doc.text(`Stunden (genehmigt): ${emp.approvedHours.toFixed(2)}h`, 25, y);
        y += 5;
        doc.text(`Lohnkosten: ${emp.totalCost.toFixed(2)}€`, 25, y);
        y += 8;

        // Entries table header
        doc.setFontSize(8);
        doc.text('Datum', 25, y);
        doc.text('Start', 55, y);
        doc.text('Ende', 75, y);
        doc.text('Pause', 95, y);
        doc.text('Stunden', 115, y);
        doc.text('Status', 140, y);
        y += 5;

        // Entries
        emp.entries.forEach(entry => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }

            const date = new Date(entry.date).toLocaleDateString('de-DE');
            const status = entry.status === 'genehmigt' ? 'Gen.' : entry.status === 'eingereicht' ? 'Eing.' : 'Entw.';
            
            doc.text(date, 25, y);
            doc.text(entry.start_time, 55, y);
            doc.text(entry.end_time, 75, y);
            doc.text(`${entry.break_minutes}m`, 95, y);
            doc.text(`${entry.total_hours.toFixed(2)}h`, 115, y);
            doc.text(status, 140, y);
            y += 5;
        });

        y += 10;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=Zeiterfassung_${monthName}_${year}.pdf`
        }
    });
}

function generateExcel(employeeData, monthName, year) {
    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
        ['Zeiterfassungsbericht', `${monthName} ${year}`],
        ['Erstellt am', new Date().toLocaleDateString('de-DE')],
        [],
        ['Zusammenfassung'],
        ['Gesamtstunden (genehmigt)', Object.values(employeeData).reduce((sum, emp) => sum + emp.approvedHours, 0).toFixed(2)],
        ['Gesamtkosten', Object.values(employeeData).reduce((sum, emp) => sum + emp.totalCost, 0).toFixed(2) + '€'],
        ['Anzahl Mitarbeiter', Object.keys(employeeData).length],
        [],
        ['Mitarbeiter', 'MA-Nr.', 'Stundensatz', 'Stunden (gesamt)', 'Stunden (genehmigt)', 'Lohnkosten']
    ];

    Object.values(employeeData).forEach(emp => {
        summaryData.push([
            emp.name,
            emp.employee_number,
            emp.hourly_rate.toFixed(2) + '€',
            emp.totalHours.toFixed(2),
            emp.approvedHours.toFixed(2),
            emp.totalCost.toFixed(2) + '€'
        ]);
    });

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Übersicht');

    // Detailed Sheet
    const detailData = [
        ['Mitarbeiter', 'MA-Nr.', 'Datum', 'Start', 'Ende', 'Pause (Min)', 'Stunden', 'Status', 'Notizen']
    ];

    Object.values(employeeData).forEach(emp => {
        emp.entries.forEach(entry => {
            detailData.push([
                emp.name,
                emp.employee_number,
                entry.date,
                entry.start_time,
                entry.end_time,
                entry.break_minutes,
                entry.total_hours.toFixed(2),
                entry.status,
                entry.notes || ''
            ]);
        });
    });

    const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Details');

    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(excelBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=Zeiterfassung_${monthName}_${year}.xlsx`
        }
    });
}