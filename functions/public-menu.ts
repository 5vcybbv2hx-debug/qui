import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const tableNumber = url.searchParams.get('table');

        // Hole Menü-Items (ohne Authentifizierung, daher asServiceRole)
        const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true });
        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));

        // Hole Firmendaten
        const companyData = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyData[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

        // Gruppiere Items nach Kategorie
        const categories = [...new Set(sortedItems.map(item => item.category).filter(Boolean))];
        categories.unshift('all');

        const html = `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${barName} - Getränkekarte</title>
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
            position: sticky;
            top: 0;
            z-index: 100;
        }
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
        }
        .logo-section {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
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
            box-shadow: 0 8px 16px rgba(245, 158, 11, 0.2);
        }
        h1 { font-size: 1.75rem; color: #f1f5f9; }
        .table-info { color: #94a3b8; font-size: 0.875rem; }
        .filters {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding: 0.5rem 0;
        }
        .filter-btn {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            background: rgba(30, 41, 59, 0.5);
            color: #94a3b8;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }
        .filter-btn.active {
            background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%);
            color: #1e293b;
            border-color: transparent;
        }
        .reserve-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%);
            color: #1e293b;
            border-radius: 0.75rem;
            text-decoration: none;
            font-weight: 600;
            margin-top: 1rem;
        }
        .content {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 1.5rem;
        }
        .card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1rem;
            overflow: hidden;
            transition: transform 0.2s;
        }
        .card:hover { transform: translateY(-4px); }
        .card-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: rgba(148, 163, 184, 0.1);
        }
        .card-content {
            padding: 1.5rem;
        }
        .card-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .card-description {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .price {
            font-size: 1.5rem;
            font-weight: 700;
            color: #f59e0b;
        }
        .category-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 9999px;
            font-size: 0.75rem;
            color: #f59e0b;
        }
        .footer {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            padding: 2rem 1rem;
            margin-top: 3rem;
            text-align: center;
            color: #94a3b8;
        }
        .empty-state {
            text-align: center;
            padding: 5rem 1rem;
        }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo">🍷</div>
                <div>
                    <h1>${barName}</h1>
                    ${tableNumber ? `<div class="table-info">Tisch ${tableNumber}</div>` : ''}
                </div>
            </div>
            <a href="/api/functions/public-reservation" class="reserve-btn">
                📅 Reservieren
            </a>
            <div class="filters">
                ${categories.map(cat => `
                    <button class="filter-btn ${cat === 'all' ? 'active' : ''}" onclick="filterCategory('${cat}')">
                        ${cat === 'all' ? 'Alle' : cat}
                    </button>
                `).join('')}
            </div>
        </div>
    </header>

    <main class="content">
        <div class="grid" id="menu-grid">
            ${sortedItems.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">🍷</div>
                    <h2>Keine Getränke gefunden</h2>
                    <p style="color: #94a3b8; margin-top: 0.5rem;">Die Getränkekarte ist derzeit leer.</p>
                </div>
            ` : sortedItems.map(item => `
                <div class="card" data-category="${item.category || 'other'}">
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="card-image">` : ''}
                    <div class="card-content">
                        <h3 class="card-title">${item.name}</h3>
                        ${item.description ? `<p class="card-description">${item.description}</p>` : ''}
                        <div class="card-footer">
                            <div class="price">${item.price ? `€${item.price.toFixed(2)}` : ''}</div>
                            ${item.category ? `<span class="category-badge">${item.category}</span>` : ''}
                        </div>
                    </div>
                </div>
            `).join('')}
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

    <script>
        function filterCategory(category) {
            const cards = document.querySelectorAll('.card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }
    </script>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('Fehler:', error);
        return new Response(`<html><body><h1>Fehler beim Laden der Getränkekarte</h1><p>${error.message}</p></body></html>`, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
});