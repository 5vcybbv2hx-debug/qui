Deno.serve(async (req) => {
    try {
        const appId = Deno.env.get('BASE44_APP_ID');
        if (!appId) {
            throw new Error('App ID nicht gefunden');
        }

        const baseUrl = 'https://api.base44.com';
        const headers = {
            'X-App-Id': appId,
            'Content-Type': 'application/json'
        };

        // Hole Firmendaten
        const companyResponse = await fetch(`${baseUrl}/entities/CompanyInfo`, { headers });
        const companyData = await companyResponse.json();
        const companyInfo = (companyData.data && companyData.data[0]) || {};
        const barName = companyInfo.company_name || 'BarManager';

        if (req.method === 'POST') {
            const formData = await req.formData();
            const data = {
                customer_name: formData.get('customer_name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                date: formData.get('date'),
                time: formData.get('time'),
                guests: parseInt(formData.get('guests')),
                notes: formData.get('notes') || '',
                guest_token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                status: 'vorgemerkt',
                source: 'online'
            };

            // Erstelle Reservierung
            const createResponse = await fetch(`${baseUrl}/entities/Reservation`, {
                method: 'POST',
                headers,
                body: JSON.stringify(data)
            });

            if (!createResponse.ok) {
                throw new Error('Fehler beim Erstellen der Reservierung');
            }

            const reservation = await createResponse.json();

            // Erfolgsseite
            const dateObj = new Date(reservation.date);
            const formattedDate = dateObj.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });

            const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservierung bestätigt - ${barName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .card {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1rem;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
        }
        .success-icon {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: rgba(34, 197, 94, 0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 1.5rem;
            font-size: 2.5rem;
        }
        h1 { text-align: center; font-size: 2rem; margin-bottom: 1rem; }
        .subtitle { text-align: center; color: #94a3b8; margin-bottom: 2rem; }
        .details {
            background: rgba(148, 163, 184, 0.1);
            border-radius: 0.75rem;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem 0;
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { color: #94a3b8; }
        .detail-value { font-weight: 600; }
        .info-box {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 0.75rem;
            padding: 1rem;
            text-align: center;
            font-size: 0.875rem;
            margin-bottom: 1.5rem;
        }
        .button {
            display: block;
            width: 100%;
            padding: 1rem;
            background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%);
            color: #1e293b;
            border: none;
            border-radius: 0.75rem;
            font-weight: 600;
            text-decoration: none;
            text-align: center;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="success-icon">✓</div>
        <h1>Reservierung erhalten!</h1>
        <p class="subtitle">Vielen Dank, <strong>${reservation.customer_name}</strong>!<br>
        Wir haben Ihre Reservierung erhalten und werden sie in Kürze bestätigen.</p>
        
        <div class="details">
            <h3 style="margin-bottom: 1rem;">Ihre Reservierungsdetails:</h3>
            <div class="detail-row">
                <span class="detail-label">Datum:</span>
                <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Uhrzeit:</span>
                <span class="detail-value">${reservation.time} Uhr</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Personen:</span>
                <span class="detail-value">${reservation.guests}</span>
            </div>
            ${reservation.notes ? `
            <div class="detail-row">
                <span class="detail-label">Ihre Anmerkungen:</span>
                <span class="detail-value">${reservation.notes}</span>
            </div>
            ` : ''}
        </div>

        <div class="info-box">
            📧 Sie erhalten in Kürze eine Bestätigungsmail an<br>
            <strong>${reservation.email}</strong><br>
            mit einem Link zur Verwaltung Ihrer Reservierung.
        </div>

        <a href="/api/functions/public-menu" class="button">
            🍷 Zur Getränkekarte
        </a>
    </div>
</body>
</html>`;

            return new Response(html, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // GET: Formular anzeigen
        const minDate = new Date().toISOString().split('T')[0];
        const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservierung - ${barName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            color: #f1f5f9;
            min-height: 100vh;
        }
        .header {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            padding: 1.5rem;
        }
        .logo-section {
            max-width: 800px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            gap: 1rem;
        }
        .logo {
            width: 48px;
            height: 48px;
            border-radius: 16px;
            background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
        }
        h1 { font-size: 1.75rem; }
        .subtitle { color: #94a3b8; font-size: 0.875rem; }
        .content {
            max-width: 800px;
            margin: 3rem auto;
            padding: 0 1rem;
        }
        .card {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1rem;
            padding: 2rem;
        }
        .card-header {
            margin-bottom: 2rem;
        }
        .card-title { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .card-description { color: #94a3b8; font-size: 0.875rem; }
        .form-group {
            margin-bottom: 1.5rem;
        }
        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        input, textarea {
            width: 100%;
            padding: 0.75rem;
            background: rgba(148, 163, 184, 0.1);
            border: 1px solid rgba(148, 163, 184, 0.2);
            border-radius: 0.5rem;
            color: #f1f5f9;
            font-family: inherit;
        }
        input:focus, textarea:focus {
            outline: none;
            border-color: #f59e0b;
        }
        textarea {
            min-height: 100px;
            resize: vertical;
        }
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .button {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%);
            color: #1e293b;
            border: none;
            border-radius: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .button:hover { transform: translateY(-2px); }
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .link {
            display: inline-block;
            color: #94a3b8;
            text-decoration: none;
            margin-top: 1rem;
            text-align: center;
            width: 100%;
        }
        .required { color: #ef4444; }
        .footer {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            padding: 2rem 1rem;
            margin-top: 3rem;
            text-align: center;
            color: #94a3b8;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="logo-section">
            <div class="logo">🍷</div>
            <div>
                <h1>${barName}</h1>
                <div class="subtitle">Online Reservierung</div>
            </div>
        </div>
    </header>

    <main class="content">
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">Tisch reservieren</h2>
                <p class="card-description">
                    Reservieren Sie jetzt Ihren Tisch. Wir bestätigen Ihre Reservierung in Kürze per E-Mail.
                </p>
            </div>
            
            <form method="POST" onsubmit="document.getElementById('submitBtn').disabled = true;">
                <div class="form-row">
                    <div class="form-group">
                        <label for="customer_name">Name <span class="required">*</span></label>
                        <input type="text" id="customer_name" name="customer_name" required placeholder="Ihr Name">
                    </div>
                    <div class="form-group">
                        <label for="phone">Telefon <span class="required">*</span></label>
                        <input type="tel" id="phone" name="phone" required placeholder="+49 123 456789">
                    </div>
                </div>

                <div class="form-group">
                    <label for="email">E-Mail <span class="required">*</span></label>
                    <input type="email" id="email" name="email" required placeholder="ihre@email.de">
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label for="date">Datum <span class="required">*</span></label>
                        <input type="date" id="date" name="date" required min="${minDate}">
                    </div>
                    <div class="form-group">
                        <label for="time">Uhrzeit <span class="required">*</span></label>
                        <input type="time" id="time" name="time" required>
                    </div>
                    <div class="form-group">
                        <label for="guests">Personen <span class="required">*</span></label>
                        <input type="number" id="guests" name="guests" required min="1" max="20" value="2">
                    </div>
                </div>

                <div class="form-group">
                    <label for="notes">Besondere Wünsche</label>
                    <textarea id="notes" name="notes" placeholder="z.B. Allergien, Kinderstuhl, Fensterplatz..."></textarea>
                </div>

                <button type="submit" class="button" id="submitBtn">Jetzt reservieren</button>
                <p style="text-align: center; font-size: 0.75rem; color: #94a3b8; margin-top: 1rem;">
                    <span class="required">*</span> Pflichtfelder
                </p>

                <a href="/api/functions/public-menu" class="link">🍷 Zur Getränkekarte</a>
            </form>
        </div>
    </main>

    <footer class="footer">
        <p>${companyInfo.address || ''}</p>
        <p style="margin-top: 0.5rem;">
            ${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}
            ${companyInfo.phone && companyInfo.email ? ' • ' : ''}
            ${companyInfo.email ? `E-Mail: ${companyInfo.email}` : ''}
        </p>
        <p style="margin-top: 1rem; font-size: 0.875rem;">© 2026 ${barName}. Alle Rechte vorbehalten.</p>
    </footer>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('Fehler:', error);
        return new Response(`<html><body><h1>Fehler</h1><p>${error.message}</p></body></html>`, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
});