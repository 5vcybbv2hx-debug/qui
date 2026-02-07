import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const tableNumber = url.searchParams.get('table');

        // Hole verfügbare Menü-Items (Service Role für öffentlichen Zugriff)
        const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true });
        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));

        // Hole Firmendaten
        const companyData = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyData[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

        // Gruppiere nach Kategorie
        const categories = ['Alle', ...new Set(sortedItems.map(item => item.category).filter(Boolean))];

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${barName} - Getränkekarte</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            min-height: 100vh;
            padding-bottom: 2rem;
        }
        .header {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            padding: 1.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header-content {
            max-width: 1200px;
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
        h1 { font-size: 1.75rem; color: #f1f5f9; font-weight: 700; }
        .table-info { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
        .filters {
            display: flex;
            gap: 0.5rem;
            overflow-x: auto;
            padding: 0.5rem 0;
            -webkit-overflow-scrolling: touch;
        }
        .filters::-webkit-scrollbar { height: 4px; }
        .filters::-webkit-scrollbar-track { background: rgba(148, 163, 184, 0.1); }
        .filters::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.5); border-radius: 2px; }
        .filter-btn {
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            border: 1px solid rgba(148, 163, 184, 0.2);
            background: rgba(30, 41, 59, 0.5);
            color: #94a3b8;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            font-size: 0.875rem;
            font-weight: 500;
        }
        .filter-btn:hover { background: rgba(30, 41, 59, 0.8); }
        .filter-btn.active {
            background: linear-gradient(90deg, #f59e0b 0%, #ea580c 100%);
            color: #0f172a;
            border-color: transparent;
            font-weight: 600;
        }
        .content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 1.5rem;
        }
        .card {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1rem;
            overflow: hidden;
            transition: all 0.3s;
        }
        .card:hover { 
            transform: translateY(-4px);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
        }
        .card-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%);
        }
        .card-content { padding: 1.5rem; }
        .card-title {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: #f1f5f9;
        }
        .card-description {
            color: #94a3b8;
            font-size: 0.875rem;
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .price {
            font-size: 1.75rem;
            font-weight: 700;
            color: #f59e0b;
        }
        .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
        .badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .badge-category {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            color: #f59e0b;
        }
        .badge-outline {
            background: transparent;
            border: 1px solid rgba(148, 163, 184, 0.2);
            color: #94a3b8;
        }
        .badge-special {
            background: rgba(34, 197, 94, 0.1);
            border: 1px solid rgba(34, 197, 94, 0.2);
            color: #22c55e;
        }
        .allergens {
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            font-size: 0.75rem;
            color: #64748b;
        }
        .allergens strong { color: #94a3b8; }
        .footer {
            background: rgba(30, 41, 59, 0.95);
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            padding: 2rem 1rem;
            margin-top: 3rem;
            text-align: center;
            color: #94a3b8;
        }
        .footer p { margin: 0.5rem 0; }
        .empty-state {
            text-align: center;
            padding: 5rem 1rem;
            color: #64748b;
        }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; opacity: 0.5; }
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
            <div class="filters">
                ${categories.map((cat, idx) => `
                    <button class="filter-btn ${idx === 0 ? 'active' : ''}" onclick="filterCategory('${cat}')">
                        ${cat}
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
                    <h2>Keine Getränke verfügbar</h2>
                    <p style="margin-top: 0.5rem;">Die Getränkekarte wird gerade aktualisiert.</p>
                </div>
            ` : sortedItems.map(item => `
                <div class="card" data-category="${item.category || 'Sonstiges'}">
                    ${item.image_url ? `<img src="${item.image_url}" alt="${item.name}" class="card-image" loading="lazy">` : ''}
                    <div class="card-content">
                        <h3 class="card-title">${item.name}</h3>
                        ${item.description ? `<p class="card-description">${item.description}</p>` : ''}
                        <div class="card-footer">
                            <div class="price">€${item.price ? item.price.toFixed(2) : '0.00'}</div>
                        </div>
                        <div class="badges">
                            ${item.category ? `<span class="badge badge-category">${item.category}</span>` : ''}
                            ${item.size ? `<span class="badge badge-outline">${item.size}</span>` : ''}
                            ${item.alcohol_content ? `<span class="badge badge-outline">${item.alcohol_content}% Vol.</span>` : ''}
                            ${item.is_seasonal ? `<span class="badge badge-special">Saisonal</span>` : ''}
                            ${item.is_special ? `<span class="badge badge-special">Special</span>` : ''}
                        </div>
                        ${item.allergens ? `
                            <div class="allergens">
                                <strong>Allergene:</strong> ${item.allergens}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </main>

    <footer class="footer">
        ${companyInfo.address ? `<p>${companyInfo.address}</p>` : ''}
        <p>
            ${companyInfo.phone ? `Tel: ${companyInfo.phone}` : ''}
            ${companyInfo.phone && companyInfo.email ? ' • ' : ''}
            ${companyInfo.email ? `E-Mail: ${companyInfo.email}` : ''}
        </p>
        <p style="margin-top: 1rem; font-size: 0.875rem;">© 2026 ${barName}</p>
    </footer>

    <script>
        function filterCategory(category) {
            const cards = document.querySelectorAll('.card');
            const buttons = document.querySelectorAll('.filter-btn');
            
            buttons.forEach(btn => {
                btn.classList.remove('active');
                if (btn.textContent.trim() === category) {
                    btn.classList.add('active');
                }
            });
            
            cards.forEach(card => {
                if (category === 'Alle' || card.dataset.category === category) {
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
        return new Response(`
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        margin: 0;
                        background: #0f172a;
                        color: #f1f5f9;
                        text-align: center;
                        padding: 2rem;
                    }
                    h1 { color: #f59e0b; margin-bottom: 1rem; }
                </style>
            </head>
            <body>
                <div>
                    <h1>⚠️ Fehler</h1>
                    <p>Die Getränkekarte konnte nicht geladen werden.</p>
                    <p style="color: #94a3b8; margin-top: 1rem;">${error.message}</p>
                </div>
            </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
});