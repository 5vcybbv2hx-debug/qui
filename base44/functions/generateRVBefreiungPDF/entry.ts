import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { employeeData, sigEmployee, sigEmployer, ortDatumAN, ortDatumAG, eingangsDatum, wirkungsDatum } = await req.json();

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210;
    const margin = 20;
    const contentW = W - 2 * margin;

    // ── Seite 1: Merkblatt (vereinfacht) ──────────────────────────────────────
    doc.setFillColor(220, 80, 30);
    doc.rect(0, 0, W, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('minijob-zentrale · einfach. informieren. anmelden.', W - margin, 7.5, { align: 'right' });

    doc.setTextColor(220, 80, 30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Merkblatt über die möglichen Folgen einer Befreiung', margin, 28);
    doc.text('von der Rentenversicherungspflicht', margin, 35);

    const merkblattText = [
        ['Allgemeines', true],
        ['Seit dem 1. Januar 2013 unterliegen Arbeitnehmer, die eine geringfügig entlohnte Beschäftigung (450-Euro-Minijob) ausüben,', false],
        ['grundsätzlich der Versicherungs- und vollen Beitragspflicht in der gesetzlichen Rentenversicherung. Der vom Arbeitnehmer zu', false],
        ['tragende Anteil am Rentenversicherungsbeitrag beläuft sich auf 3,9 Prozent des Arbeitsentgelts.', false],
        ['', false],
        ['Vorteile der vollen Beitragszahlung zur Rentenversicherung', true],
        ['Pflichtbeitragszeiten in der Rentenversicherung ermöglichen u.a. einen früheren Rentenbeginn, Ansprüche auf Rehabilitation,', false],
        ['Erwerbsminderungsrente sowie Zugang zur Riester-Rente.', false],
        ['', false],
        ['Antrag auf Befreiung von der Rentenversicherungspflicht', true],
        ['Möchte der Arbeitnehmer nicht versicherungspflichtig sein, kann er seinen Arbeitgeber schriftlich über den Wunsch zur', false],
        ['Befreiung informieren. Die Befreiung gilt für alle gleichzeitig ausgeübten Minijobs und ist für die Dauer der Beschäftigung bindend.', false],
        ['', false],
        ['Konsequenzen aus der Befreiung', true],
        ['Bei Befreiung zahlt nur der Arbeitgeber 15 % Pauschalbeitrag. Der Arbeitnehmer erwirbt nur anteilige Wartezeiten.', false],
        ['', false],
        ['Hinweis: Vor der Entscheidung wird eine individuelle Beratung bei der Deutschen Rentenversicherung empfohlen.', false],
        ['Servicetelefon (kostenlos): 0800 10004800', false],
    ];

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    let y = 44;
    for (const [line, isBold] of merkblattText) {
        if (isBold) {
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 80, 30);
            doc.setFontSize(10);
            y += 3;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(9);
        }
        if (line !== '') doc.text(line, margin, y);
        y += isBold ? 5 : 4.5;
    }

    // Knappschaft logo hint
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 80, 30);
    doc.setFontSize(9);
    doc.text('Knappschaft Bahn See', margin, 280);

    // ── Seite 2: Antrag ───────────────────────────────────────────────────────
    doc.addPage();

    // Orange top bar
    doc.setFillColor(220, 80, 30);
    doc.rect(0, 0, W, 12, 'F');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text('minijob-zentrale · einfach. informieren. anmelden.', W - margin, 7.5, { align: 'right' });

    // Titel
    doc.setTextColor(220, 80, 30);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Antrag auf Befreiung von der Rentenversicherungspflicht', margin, 24);
    doc.setFontSize(11);
    doc.text('bei einer geringfügig entlohnten Beschäftigung nach § 6 Abs. 1b SGB VI', margin, 30);

    y = 42;

    // Arbeitnehmer Abschnitt
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Arbeitnehmer:', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Name
    doc.text('Name:', margin, y);
    doc.line(margin + 20, y + 1, margin + contentW, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(employeeData.nachname || '', margin + 22, y);
    y += 8;

    // Vorname
    doc.setFont('helvetica', 'normal');
    doc.text('Vorname:', margin, y);
    doc.line(margin + 20, y + 1, margin + contentW, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.text(employeeData.vorname || '', margin + 22, y);
    y += 8;

    // Rentenversicherungsnummer
    doc.setFont('helvetica', 'normal');
    doc.text('Rentenversicherungsnummer:', margin, y);
    // Kästchen
    const rvNr = (employeeData.pension_number || '').replace(/\s/g, '');
    const boxStart = margin + 65;
    for (let i = 0; i < 12; i++) {
        const bx = boxStart + i * 7;
        doc.rect(bx, y - 4, 6, 6);
        if (rvNr[i]) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(rvNr[i], bx + 1.5, y - 0.5);
        }
    }
    y += 12;

    // Antragstext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const antragstext = 'Hiermit beantrage ich die Befreiung von der Versicherungspflicht in der Rentenversicherung im Rahmen meiner geringfügig entlohnten Beschäftigung und verzichte damit auf den Erwerb von Pflichtbeitragszeiten. Ich habe die Hinweise auf dem „Merkblatt über die möglichen Folgen einer Befreiung von der Rentenversicherungspflicht" zur Kenntnis genommen.';
    const antragLines = doc.splitTextToSize(antragstext, contentW);
    doc.text(antragLines, margin, y);
    y += antragLines.length * 4.5 + 3;

    const antragstext2 = 'Mir ist bekannt, dass der Befreiungsantrag für alle von mir zeitgleich ausgeübten geringfügig entlohnten Beschäftigungen gilt und für die Dauer der Beschäftigungen bindend ist; eine Rücknahme ist nicht möglich. Ich verpflichte mich, alle weiteren Arbeitgeber, bei denen ich eine geringfügig entlohnte Beschäftigung ausübe, über diesen Befreiungsantrag zu informieren.';
    const antragLines2 = doc.splitTextToSize(antragstext2, contentW);
    doc.text(antragLines2, margin, y);
    y += antragLines2.length * 4.5 + 8;

    // Unterschrift Arbeitnehmer
    const halfW = (contentW - 10) / 2;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    // Linke Seite: Ort, Datum
    doc.line(margin, y, margin + halfW, y);
    doc.text('(Ort, Datum)', margin, y + 4);
    if (ortDatumAN) {
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text(ortDatumAN, margin, y - 3);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
    }
    // Rechte Seite: Unterschrift AN
    const rightX = margin + halfW + 10;
    doc.line(rightX, y, margin + contentW, y);
    doc.text('(Unterschrift des Arbeitnehmers)', rightX, y + 4);
    if (sigEmployee && sigEmployee.startsWith('data:image')) {
        try { doc.addImage(sigEmployee, 'PNG', rightX, y - 14, halfW, 13); } catch {}
    }
    y += 18;

    // Arbeitgeber Abschnitt
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Arbeitgeber:', margin, y);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Name:', margin, y);
    doc.line(margin + 20, y + 1, margin + contentW, y + 1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Pierre Hugendubel / SAVO Lounge-Club', margin + 22, y);
    y += 8;

    // Betriebsnummer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Betriebsnummer:', margin, y);
    const bnr = '91042972';
    const bnrStart = margin + 40;
    for (let i = 0; i < bnr.length; i++) {
        const bx = bnrStart + i * 7;
        doc.rect(bx, y - 4, 6, 6);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(bnr[i], bx + 1.5, y - 0.5);
    }
    y += 10;

    // Eingangsdatum
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.text('Der Befreiungsantrag ist am', margin, y);
    // Datumsfelder
    const datumStart = margin + 60;
    const datumFelder = ['T','T','M','M','J','J','J','J'];
    const eingDatum = (eingangsDatum || '').replace(/\./g, '').replace(/-/g, '');
    for (let i = 0; i < 8; i++) {
        doc.rect(datumStart + i * 7, y - 4.5, 6, 6);
        const ch = eingDatum[i] || '';
        if (ch) { doc.setFont('helvetica', 'bold'); doc.text(ch, datumStart + i * 7 + 1.5, y - 0.5); }
    }
    doc.setFont('helvetica', 'normal');
    doc.text('bei mir eingegangen.', datumStart + 58, y);
    y += 8;

    doc.text('Die Befreiung wirkt ab dem', margin, y);
    const wirkStart = margin + 58;
    const wirkDatum = (wirkungsDatum || '').replace(/\./g, '').replace(/-/g, '');
    for (let i = 0; i < 8; i++) {
        doc.rect(wirkStart + i * 7, y - 4.5, 6, 6);
        const ch = wirkDatum[i] || '';
        if (ch) { doc.setFont('helvetica', 'bold'); doc.text(ch, wirkStart + i * 7 + 1.5, y - 0.5); }
    }
    doc.text('.', wirkStart + 58, y);
    y += 12;

    // Unterschrift Arbeitgeber
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.line(margin, y, margin + halfW, y);
    doc.text('(Ort, Datum)', margin, y + 4);
    if (ortDatumAG) {
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'bold');
        doc.text(ortDatumAG, margin, y - 3);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
    }
    doc.line(rightX, y, margin + contentW, y);
    doc.text('(Unterschrift des Arbeitgebers)', rightX, y + 4);
    if (sigEmployer && sigEmployer.startsWith('data:image')) {
        try { doc.addImage(sigEmployer, 'PNG', rightX, y - 14, halfW, 13); } catch {}
    }
    y += 18;

    // Hinweis Box
    doc.setDrawColor(220, 80, 30);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentW, 20, 2, 2, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(50, 50, 50);
    doc.text('Hinweis für den Arbeitgeber:', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Der Befreiungsantrag ist nach § 8 Abs. 2 Nr. 4a Beitragsverfahrensverordnung (BVV) zu den Entgeltunterlagen', margin + 4, y + 12);
    doc.text('zu nehmen und nicht an die Minijob-Zentrale zu senden.', margin + 4, y + 17);

    // Output
    const pdfBytes = doc.output('arraybuffer');
    const file = new File([pdfBytes], `RV_Befreiungsantrag_${employeeData.nachname || 'MA'}.pdf`, { type: 'application/pdf' });

    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    const pdf_url = result?.file_url || result?.url || (typeof result === 'string' ? result : null);

    return Response.json({
        pdf_url,
        filename: `RV_Befreiungsantrag_${employeeData.nachname || 'MA'}.pdf`
    });
});