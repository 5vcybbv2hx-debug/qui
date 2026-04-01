import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.2';

// HIGH FIX: Added admin role check — previously any authenticated user could submit
// arbitrary formData with IBAN, Steuer-ID, Rentenversicherungsnr. and get a PDF.
// This function handles highly sensitive personal data (§ DSGVO Art. 9).
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { formData } = await req.json();

        const doc = new jsPDF();
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Firma: SAVO-Lounge-Club', 20, 20);
        
        doc.setFontSize(14);
        doc.text('Personalfragebogen Minijob', 20, 30);
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        let y = 45;
        
        doc.text(`Name, Vorname: ${formData.name}, ${formData.vorname}`, 20, y); y += 7;
        doc.text(`Straße: ${formData.street}`, 20, y); y += 7;
        doc.text(`PLZ, Wohnort: ${formData.postal_code}, ${formData.city}`, 20, y); y += 7;
        doc.text(`Nationalität: ${formData.nationality}`, 20, y); y += 7;
        doc.text(`Eintritt: ${formData.entry_date}`, 20, y); y += 7;
        doc.text(`Tätigkeit: ${formData.activity}`, 20, y); y += 7;
        doc.text(`Schul- und Berufsausbildung: ${formData.education || '-'}`, 20, y); y += 10;
        
        const workdays = `Mo:${formData.monday || 0} Di:${formData.tuesday || 0} Mi:${formData.wednesday || 0} Do:${formData.thursday || 0} Fr:${formData.friday || 0} Sa:${formData.saturday || 0} So:${formData.sunday || 0}`;
        doc.text(`Wöchentliche Arbeitszeit: ${formData.weekly_hours} - ${workdays}`, 20, y); y += 7;
        doc.text(`Stundenlohn: ${formData.hourly_rate} EUR`, 20, y); y += 10;
        
        doc.text(`Steuer-IdNr.: ${formData.tax_id}`, 20, y); y += 7;
        doc.text(`Rentenversicherungs-Nr.: ${formData.pension_number || '-'}`, 20, y); y += 10;
        
        doc.text(`Geburtsdatum: ${formData.birthday}`, 20, y);
        doc.text(`Geburtsname: ${formData.birth_name || '-'}`, 110, y); y += 7;
        doc.text(`Geburtsort: ${formData.birth_place || '-'}`, 20, y); y += 7;
        doc.text(`Krankenkasse: ${formData.health_insurance || '-'}`, 20, y); y += 10;
        
        doc.text(`Befreiungsantrag Rentenversicherung: ${formData.pension_exemption ? 'Ja' : 'Nein'}`, 20, y); y += 7;
        doc.text(`Versicherungspflichtige Beschäftigung: ${formData.has_main_job ? 'Ja' : 'Nein'}`, 20, y); y += 7;
        doc.text(`Weitere geringfügige Beschäftigung: ${formData.has_other_minijob ? 'Ja' : 'Nein'}`, 20, y); y += 7;
        
        if (formData.has_other_minijob && formData.other_minijob_details) {
            doc.text(`Details: ${formData.other_minijob_details}`, 20, y); y += 7;
        }
        y += 5;
        
        doc.setFont(undefined, 'bold');
        doc.text('Bankverbindung:', 20, y);
        doc.setFont(undefined, 'normal'); y += 7;
        doc.text(`Kreditinstitut: ${formData.bank_name}`, 20, y); y += 7;
        doc.text(`IBAN: ${formData.iban}`, 20, y); y += 7;
        doc.text(`BIC: ${formData.bic || '-'}`, 20, y); y += 15;
        
        doc.setFontSize(8);
        doc.text('Ich versichere, dass ich die vorstehenden Angaben nach bestem Wissen und Gewissen', 20, y); y += 4;
        doc.text('gemacht habe und verpflichte mich, alle Veränderungen unverzüglich mitzuteilen.', 20, y); y += 10;
        
        const today = new Date().toLocaleDateString('de-DE');
        doc.text(`Ort, Datum: ${today}`, 20, y);
        doc.text('Unterschrift Arbeitnehmer: ___________________', 100, y); y += 15;
        doc.text('Unterschrift Arbeitgeber: ___________________', 100, y);
        
        const pdfBytes = doc.output('arraybuffer');
        const pdfBlob = new Uint8Array(pdfBytes);
        
        const fileName = `Personalbogen_${formData.name}_${formData.vorname}_${Date.now()}.pdf`;
        const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
        
        const { data: uploadData } = await base44.asServiceRole.integrations.Core.UploadFile({ file });

        return Response.json({ 
            success: true,
            pdf_url: uploadData.file_url,
            filename: fileName
        });

    } catch (error) {
        console.error('Error generating PDF:', error);
        return Response.json({ error: 'PDF konnte nicht erstellt werden', success: false }, { status: 500 });
    }
});