import { Download } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format, parse } from 'date-fns';

export default function CalendarExport({ shifts }) {
    const generateICS = () => {
        const lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Bar Manager//Schichtplan//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:Bar Schichtplan',
            'X-WR-TIMEZONE:Europe/Berlin'
        ];

        shifts.forEach(shift => {
            const date = shift.date.replace(/-/g, '');
            const startTime = shift.start_time.replace(':', '') + '00';
            const endTime = shift.end_time.replace(':', '') + '00';
            
            // Handle overnight shifts (end time is next day)
            const startHour = parseInt(shift.start_time.split(':')[0]);
            const endHour = parseInt(shift.end_time.split(':')[0]);
            let endDate = date;
            
            if (endHour < startHour) {
                // Add one day to end date
                const dateObj = new Date(shift.date);
                dateObj.setDate(dateObj.getDate() + 1);
                endDate = format(dateObj, 'yyyyMMdd');
            }

            lines.push('BEGIN:VEVENT');
            lines.push(`UID:${shift.id}@barmanager.app`);
            lines.push(`DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`);
            lines.push(`DTSTART:${date}T${startTime}`);
            lines.push(`DTEND:${endDate}T${endTime}`);
            lines.push(`SUMMARY:${shift.employee_name} - ${shift.shift_type}`);
            if (shift.notes) {
                lines.push(`DESCRIPTION:${shift.notes}`);
            }
            lines.push('STATUS:CONFIRMED');
            lines.push('END:VEVENT');
        });

        lines.push('END:VCALENDAR');
        
        return lines.join('\r\n');
    };

    const handleExport = () => {
        const icsContent = generateICS();
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `bar-schichtplan-${format(new Date(), 'yyyy-MM-dd')}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <Button 
            variant="outline"
            onClick={handleExport}
            disabled={shifts.length === 0}
            className="gap-2"
        >
            <Download className="w-4 h-4" />
            Kalender exportieren
        </Button>
    );
}