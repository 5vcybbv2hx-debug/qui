import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req, { useServiceRole: true });
        const url = new URL(req.url);
        const tableNumber = url.searchParams.get('table');

        // Hole verfügbare Menü-Items (Service Role für öffentlichen Zugriff)
        const items = await base44.asServiceRole.entities.MenuItem.filter({ is_available: true });
        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));

        // Hole Firmendaten
        const companyData = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyData[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

        // Farbschema aus gespeicherten Keys
        const ACCENT_PRESETS = {
            amber:  { from: '#f59e0b', via: '#f97316' },
            orange: { from: '#f97316', via: '#ef4444' },
            rose:   { from: '#f43f5e', via: '#e11d48' },
            violet: { from: '#7c3aed', via: '#6d28d9' },
            blue:   { from: '#3b82f6', via: '#2563eb' },
            cyan:   { from: '#06b6d4', via: '#0891b2' },
            green:  { from: '#22c55e', via: '#16a34a' },
            pink:   { from: '#ec4899', via: '#db2777' },
        };
        const BG_PRESETS = {
            default: { bg: '#1a2236', card: 'rgba(30, 41, 59, 0.8)', header: 'rgba(30, 41, 59, 0.98)' },
            deep:    { bg: '#111111', card: 'rgba(28, 28, 28, 0.8)', header: 'rgba(20, 20, 20, 0.98)' },
            navy:    { bg: '#0d1a36', card: 'rgba(20, 35, 70, 0.8)', header: 'rgba(15, 25, 55, 0.98)' },
            slate:   { bg: '#1a2130', card: 'rgba(30, 38, 55, 0.8)', header: 'rgba(25, 33, 48, 0.98)' },
        };
        const accent = ACCENT_PRESETS[companyInfo.accent_color_key] || ACCENT_PRESETS.amber;
        const bgTheme = BG_PRESETS[companyInfo.bg_color_key] || BG_PRESETS.default;

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
            background: linear-gradient(135deg, ${bgTheme.bg} 0%, ${bgTheme.bg}cc 100%);
            color: #f1f5f9;
            min-height: 100vh;
            padding-bottom: 2rem;
            overflow-x: hidden;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .header {
            background: ${bgTheme.header};
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(148, 163, 184, 0.1);
            padding: 1.5rem;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.5s ease-out;
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
            width: 56px;
            height: 56px;
            border-radius: 18px;
            background: linear-gradient(135deg, ${accent.from} 0%, ${accent.via} 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.75rem;
            box-shadow: 0 10px 25px ${accent.from}66;
            transition: transform 0.3s ease;
        }
        .logo:hover { transform: scale(1.05) rotate(5deg); }
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
        .filters::-webkit-scrollbar-thumb { background: ${accent.from}80; border-radius: 2px; }
        .filter-btn {
            padding: 0.625rem 1.25rem;
            border-radius: 9999px;
            border: 2px solid rgba(148, 163, 184, 0.2);
            background: rgba(30, 41, 59, 0.5);
            color: #94a3b8;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 0.875rem;
            font-weight: 600;
            position: relative;
            overflow: hidden;
        }
        .filter-btn::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, rgba(234, 88, 12, 0.1) 100%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .filter-btn:hover {
            background: ${bgTheme.header};
            border-color: ${accent.from}4d;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        .filter-btn:hover::before { opacity: 1; }
        .filter-btn.active {
            background: linear-gradient(90deg, ${accent.from} 0%, ${accent.via} 100%);
            color: #0f172a;
            border-color: transparent;
            font-weight: 700;
            box-shadow: 0 4px 16px ${accent.from}66;
            transform: translateY(-2px);
        }
        .content {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 2rem;
        }
        @media (max-width: 640px) {
            .grid { grid-template-columns: 1fr; }
        }
        .card {
            background: ${bgTheme.card};
            backdrop-filter: blur(12px);
            border: 1px solid rgba(148, 163, 184, 0.1);
            border-radius: 1.25rem;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: fadeIn 0.6s ease-out backwards;
            position: relative;
        }
        .card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, transparent 100%);
            opacity: 0;
            transition: opacity 0.4s;
        }
        .card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            border-color: ${accent.from}4d;
        }
        .card:hover::before { opacity: 1; }
        .card:nth-child(1) { animation-delay: 0.1s; }
        .card:nth-child(2) { animation-delay: 0.2s; }
        .card:nth-child(3) { animation-delay: 0.3s; }
        .card:nth-child(4) { animation-delay: 0.4s; }
        .card:nth-child(5) { animation-delay: 0.5s; }
        .card:nth-child(6) { animation-delay: 0.6s; }
        .card-image {
            width: 100%;
            height: 280px;
            object-fit: cover;
            background: linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(100, 116, 139, 0.1) 100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card:hover .card-image {
            transform: scale(1.08);
        }
        .card-content { padding: 1.5rem; }
        .card-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 0.75rem;
            color: #f1f5f9;
            line-height: 1.3;
            transition: color 0.3s;
        }
        .card:hover .card-title { color: ${accent.from}; }
        .card-description {
            color: #94a3b8;
            font-size: 0.9375rem;
            margin-bottom: 1.25rem;
            line-height: 1.6;
        }
        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .price {
            font-size: 2.25rem;
            font-weight: 800;
            background: linear-gradient(135deg, ${accent.from} 0%, ${accent.via} 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: -0.025em;
            transition: transform 0.3s;
        }
        .card:hover .price { transform: scale(1.05); }
        .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
        .badge {
            display: inline-block;
            padding: 0.375rem 0.875rem;
            border-radius: 9999px;
            font-size: 0.8125rem;
            font-weight: 600;
            transition: all 0.3s;
        }
        .badge:hover { transform: translateY(-2px); }
        .badge-category {
            background: ${accent.from}26;
            border: 1px solid ${accent.from}4d;
            color: ${accent.from};
            box-shadow: 0 2px 8px ${accent.from}1a;
        }
        .badge-outline {
            background: transparent;
            border: 1px solid rgba(148, 163, 184, 0.3);
            color: #cbd5e1;
        }
        .badge-special {
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            color: #4ade80;
            box-shadow: 0 2px 8px rgba(34, 197, 94, 0.1);
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
            background: ${bgTheme.header}f2;
            backdrop-filter: blur(12px);
            border-top: 1px solid rgba(148, 163, 184, 0.1);
            padding: 2rem 1rem;
            margin-top: 3rem;
            text-align: center;
            color: #94a3b8;
        }
        .footer p { margin: 0.5rem 0; }
        .search-wrapper {
            margin-bottom: 0.75rem;
        }
        .search-input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.75rem;
            border-radius: 9999px;
            border: 2px solid rgba(148, 163, 184, 0.2);
            background: rgba(30, 41, 59, 0.5);
            color: #f1f5f9;
            font-size: 0.9375rem;
            outline: none;
            transition: all 0.3s;
            backdrop-filter: blur(8px);
        }
        .search-input::placeholder { color: #64748b; }
        .search-input:focus {
            border-color: ${accent.from}80;
            background: rgba(30, 41, 59, 0.8);
            box-shadow: 0 0 0 3px ${accent.from}22;
        }
        .search-container {
            position: relative;
        }
        .search-icon {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #64748b;
            pointer-events: none;
            font-size: 1rem;
        }
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
            <div class="search-wrapper">
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="search" class="search-input" placeholder="Getränk suchen..." oninput="searchMenu(this.value)" id="search-input">
                </div>
            </div>
            <div class="filters" id="filter-bar">
                ${categories.map((cat, idx) => `<button class="filter-btn ${idx === 0 ? 'active' : ''}" data-cat="${cat.replace(/"/g, '&quot;')}">${cat}</button>`).join('')}
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
                <div class="card" data-category="${item.category || 'Sonstiges'}" data-name="${(item.name || '').toLowerCase()}" data-description="${(item.description || '').toLowerCase()}">
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
        var activeCategory = 'Alle';
        var searchQuery = '';

        function searchMenu(value) {
            searchQuery = value.toLowerCase().trim();
            applyFilters();
        }

        function applyFilters() {
            var cards = document.querySelectorAll('.card');
            var visibleCount = 0;
            for (var i = 0; i < cards.length; i++) {
                var card = cards[i];
                var matchCat = activeCategory === 'Alle' || card.getAttribute('data-category') === activeCategory;
                var name = card.getAttribute('data-name') || '';
                var desc = card.getAttribute('data-description') || '';
                var matchSearch = searchQuery === '' || name.indexOf(searchQuery) !== -1 || desc.indexOf(searchQuery) !== -1;
                if (matchCat && matchSearch) {
                    card.style.display = 'block';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
            var empty = document.getElementById('no-results');
            if (visibleCount === 0) {
                if (!empty) {
                    empty = document.createElement('div');
                    empty.id = 'no-results';
                    empty.style.gridColumn = '1 / -1';
                    empty.style.textAlign = 'center';
                    empty.style.padding = '5rem 1rem';
                    empty.style.color = '#64748b';
                    empty.innerHTML = '<div style="font-size:4rem;opacity:0.5">🔍</div><h2>Keine Treffer</h2><p style="margin-top:0.5rem">Versuche einen anderen Suchbegriff.</p>';
                    document.getElementById('menu-grid').appendChild(empty);
                }
            } else {
                if (empty) empty.parentNode.removeChild(empty);
            }
        }

        document.getElementById('filter-bar').addEventListener('click', function(e) {
            var btn = e.target.closest('.filter-btn');
            if (!btn) return;
            activeCategory = btn.getAttribute('data-cat');
            var buttons = document.querySelectorAll('.filter-btn');
            for (var i = 0; i < buttons.length; i++) {
                buttons[i].classList.remove('active');
            }
            btn.classList.add('active');
            applyFilters();
        });



        window.addEventListener('load', function() {
            document.body.style.opacity = '0';
            setTimeout(function() {
                document.body.style.transition = 'opacity 0.5s';
                document.body.style.opacity = '1';
            }, 100);
        });
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