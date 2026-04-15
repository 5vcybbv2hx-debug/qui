import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// MEDIUM FIX: Error page no longer leaks internal error.message to the browser.
Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const tableNumber = url.searchParams.get('table');

        const items = await base44.asServiceRole.entities.MenuItem.list();
        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));

        const companyData = await base44.asServiceRole.entities.CompanyInfo.list();
        const companyInfo = companyData[0] || {};
        const barName = companyInfo.company_name || 'BarManager';

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

        // Helper: escape HTML to prevent XSS when rendering user data
        const esc = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        const categories = ['Alle', ...new Set(sortedItems.map(item => item.category || 'Sonstiges').filter(Boolean))];

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(barName)} - Getränkekarte</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, ${bgTheme.bg} 0%, ${bgTheme.bg}cc 100%); color: #f1f5f9; min-height: 100vh; padding-bottom: 2rem; overflow-x: hidden; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        .header { background: ${bgTheme.header}; backdrop-filter: blur(20px); border-bottom: 1px solid rgba(148,163,184,0.1); padding: 1.5rem; position: sticky; top: 0; z-index: 100; box-shadow: 0 10px 30px rgba(0,0,0,0.3); animation: slideIn 0.5s ease-out; }
        .header-content { max-width: 1200px; margin: 0 auto; }
        .logo-section { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .logo { width: 56px; height: 56px; border-radius: 18px; background: linear-gradient(135deg, ${accent.from} 0%, ${accent.via} 100%); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 10px 25px ${accent.from}66; }
        h1 { font-size: 1.75rem; color: #f1f5f9; font-weight: 700; }
        .table-info { color: #94a3b8; font-size: 0.875rem; margin-top: 0.25rem; }
        .filters { display: flex; gap: 0.5rem; overflow-x: auto; padding: 0.5rem 0; }
        .filter-btn { padding: 0.625rem 1.25rem; border-radius: 9999px; border: 2px solid rgba(148,163,184,0.2); background: rgba(30,41,59,0.5); color: #94a3b8; cursor: pointer; white-space: nowrap; transition: all 0.3s; font-size: 0.875rem; font-weight: 600; }
        .filter-btn:hover { background: ${bgTheme.header}; border-color: ${accent.from}4d; }
        .filter-btn.active { background: linear-gradient(90deg, ${accent.from} 0%, ${accent.via} 100%); color: #0f172a; border-color: transparent; font-weight: 700; box-shadow: 0 4px 16px ${accent.from}66; }
        .content { max-width: 1200px; margin: 0 auto; padding: 2rem 1rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 2rem; }
        @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
        .card { background: ${bgTheme.card}; backdrop-filter: blur(12px); border: 1px solid rgba(148,163,184,0.1); border-radius: 1.25rem; overflow: hidden; transition: all 0.4s; animation: fadeIn 0.6s ease-out backwards; }
        .card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border-color: ${accent.from}4d; }
        .card-image { width: 100%; height: 280px; object-fit: cover; }
        .card-content { padding: 1.5rem; }
        .card-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; color: #f1f5f9; }
        .card-description { color: #94a3b8; font-size: 0.9375rem; margin-bottom: 1.25rem; line-height: 1.6; }
        .card-footer { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
        .price { font-size: 2.25rem; font-weight: 800; background: linear-gradient(135deg, ${accent.from} 0%, ${accent.via} 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .badges { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 1rem; }
        .badge { display: inline-block; padding: 0.375rem 0.875rem; border-radius: 9999px; font-size: 0.8125rem; font-weight: 600; }
        .badge-category { background: ${accent.from}26; border: 1px solid ${accent.from}4d; color: ${accent.from}; }
        .badge-outline { background: transparent; border: 1px solid rgba(148,163,184,0.3); color: #cbd5e1; }
        .badge-special { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; }
        .allergens { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(148,163,184,0.1); font-size: 0.75rem; color: #64748b; }
        .allergens strong { color: #94a3b8; }
        .footer { background: ${bgTheme.header}f2; backdrop-filter: blur(12px); border-top: 1px solid rgba(148,163,184,0.1); padding: 2rem 1rem; margin-top: 3rem; text-align: center; color: #94a3b8; }
        .search-wrapper { margin-bottom: 0.75rem; }
        .search-input { width: 100%; padding: 0.75rem 1rem 0.75rem 2.75rem; border-radius: 9999px; border: 2px solid rgba(148,163,184,0.2); background: rgba(30,41,59,0.5); color: #f1f5f9; font-size: 0.9375rem; outline: none; transition: all 0.3s; }
        .search-input:focus { border-color: ${accent.from}80; background: rgba(30,41,59,0.8); box-shadow: 0 0 0 3px ${accent.from}22; }
        .search-container { position: relative; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; }
        .empty-state { text-align: center; padding: 5rem 1rem; color: #64748b; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo">🍷</div>
                <div>
                    <h1>${esc(barName)}</h1>
                    ${tableNumber ? `<div class="table-info">Tisch ${esc(tableNumber)}</div>` : ''}
                </div>
            </div>
            <div class="search-wrapper">
                <div class="search-container">
                    <span class="search-icon">🔍</span>
                    <input type="search" class="search-input" placeholder="Getränk suchen..." oninput="searchMenu(this.value)" id="search-input">
                </div>
            </div>
            <div class="filters" id="filter-bar">
                ${categories.map((cat, idx) => `<button class="filter-btn ${idx === 0 ? 'active' : ''}" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('')}
            </div>
        </div>
    </header>

    <main class="content">
        <div class="grid" id="menu-grid">
            ${sortedItems.length === 0 ? `<div class="empty-state"><div style="font-size:4rem;opacity:0.5">🍷</div><h2>Keine Getränke verfügbar</h2><p>Die Getränkekarte wird gerade aktualisiert.</p></div>` : 
            sortedItems.map(item => `
                <div class="card" data-category="${esc(item.category || 'Sonstiges')}" data-name="${esc((item.name || '').toLowerCase())}" data-description="${esc((item.description || '').toLowerCase())}">
                    ${item.image_url ? `<img src="${esc(item.image_url)}" alt="${esc(item.name)}" class="card-image" loading="lazy">` : ''}
                    <div class="card-content">
                        <h3 class="card-title">${esc(item.name)}</h3>
                        ${item.description ? `<p class="card-description">${esc(item.description)}</p>` : ''}
                        <div class="card-footer">
                            <div class="price">€${item.price ? item.price.toFixed(2) : '0.00'}</div>
                        </div>
                        <div class="badges">
                            ${item.category ? `<span class="badge badge-category">${esc(item.category)}</span>` : ''}
                            ${item.size ? `<span class="badge badge-outline">${esc(item.size)}</span>` : ''}
                            ${item.alcohol_content ? `<span class="badge badge-outline">${item.alcohol_content}% Vol.</span>` : ''}
                            ${item.is_seasonal ? `<span class="badge badge-special">Saisonal</span>` : ''}
                            ${item.is_special ? `<span class="badge badge-special">Special</span>` : ''}
                        </div>
                        ${item.allergens ? `<div class="allergens"><strong>Allergene:</strong> ${esc(item.allergens)}</div>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    </main>

    <footer class="footer">
        ${companyInfo.address ? `<p>${esc(companyInfo.address)}</p>` : ''}
        <p>
            ${companyInfo.phone ? `Tel: ${esc(companyInfo.phone)}` : ''}
            ${companyInfo.phone && companyInfo.email ? ' • ' : ''}
            ${companyInfo.email ? `E-Mail: ${esc(companyInfo.email)}` : ''}
        </p>
        <p style="margin-top: 1rem; font-size: 0.875rem;">© 2026 ${esc(barName)}</p>
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
                card.style.display = (matchCat && matchSearch) ? 'block' : 'none';
                if (matchCat && matchSearch) visibleCount++;
            }
            var empty = document.getElementById('no-results');
            if (visibleCount === 0) {
                if (!empty) {
                    empty = document.createElement('div');
                    empty.id = 'no-results';
                    empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:5rem 1rem;color:#64748b';
                    empty.innerHTML = '<div style="font-size:4rem;opacity:0.5">🔍</div><h2>Keine Treffer</h2>';
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
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            applyFilters();
        });

        window.addEventListener('load', function() {
            document.body.style.opacity = '0';
            setTimeout(function() { document.body.style.transition = 'opacity 0.5s'; document.body.style.opacity = '1'; }, 100);
        });
    </script>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('Fehler:', error);
        // MEDIUM FIX: Don't expose error.message to public
        return new Response(`<html><head><meta charset="UTF-8"><title>Fehler</title></head><body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="color:#f59e0b">⚠️ Fehler</h1><p>Die Getränkekarte konnte nicht geladen werden. Bitte versuche es später erneut.</p></div></body></html>`, {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
});