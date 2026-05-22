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

        // Collect all unique allergens/additives across all items (for the filter panel)
        const allAllergenSet = new Set();
        const allAdditiveSet = new Set();
        for (const item of sortedItems) {
            if (Array.isArray(item.allergens_list)) item.allergens_list.forEach(a => allAllergenSet.add(a));
            if (Array.isArray(item.additives)) item.additives.forEach(a => allAdditiveSet.add(a));
        }
        const allAllergens = [...allAllergenSet].sort();
        const allAdditives = [...allAdditiveSet].sort();
        const hasAllergenData = allAllergens.length > 0 || allAdditives.length > 0;

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(barName)} - Getraenkekarte</title>
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

        .search-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.25rem; }
        .search-wrapper { flex: 1; }
        .search-container { position: relative; }
        .search-input { width: 100%; padding: 0.75rem 2.75rem 0.75rem 2.75rem; border-radius: 9999px; border: 2px solid rgba(148,163,184,0.2); background: rgba(30,41,59,0.5); color: #f1f5f9; font-size: 1rem; outline: none; transition: all 0.3s; -webkit-appearance: none; appearance: none; }
        .search-input:focus { border-color: ${accent.from}80; background: rgba(30,41,59,0.9); box-shadow: 0 0 0 3px ${accent.from}22; }
        .search-input::placeholder { color: #64748b; }
        .search-input::-webkit-search-cancel-button { display: none; }
        .search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: #64748b; pointer-events: none; font-size: 1rem; transition: color 0.2s; }
        .search-container:focus-within .search-icon { color: ${accent.from}; }
        .search-clear { position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); background: rgba(148,163,184,0.2); border: none; border-radius: 9999px; width: 1.5rem; height: 1.5rem; display: none; align-items: center; justify-content: center; cursor: pointer; color: #94a3b8; font-size: 0.875rem; transition: all 0.2s; line-height: 1; padding: 0; }
        .search-clear:hover { background: rgba(148,163,184,0.35); color: #f1f5f9; }
        .search-clear.visible { display: flex; }
        .search-result-count { font-size: 0.75rem; color: #64748b; text-align: right; min-height: 1.1rem; transition: opacity 0.2s; padding-right: 0.75rem; margin-bottom: 0.5rem; }
        .search-result-count.highlight { color: ${accent.from}; font-weight: 600; }

        .allergen-toggle-btn { flex-shrink: 0; padding: 0.75rem 1rem; border-radius: 9999px; border: 2px solid rgba(148,163,184,0.2); background: rgba(30,41,59,0.5); color: #94a3b8; cursor: pointer; font-size: 0.875rem; font-weight: 600; white-space: nowrap; transition: all 0.3s; display: flex; align-items: center; gap: 0.4rem; }
        .allergen-toggle-btn:hover { border-color: ${accent.from}4d; color: #f1f5f9; }
        .allergen-toggle-btn.has-active { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.5); color: #fca5a5; }
        .allergen-badge { background: #ef4444; color: white; border-radius: 9999px; width: 1.25rem; height: 1.25rem; font-size: 0.7rem; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }

        .allergen-panel { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.35s ease, opacity 0.25s ease; }
        .allergen-panel.open { max-height: 700px; opacity: 1; margin-bottom: 0.75rem; }
        .allergen-panel-inner { background: rgba(15,23,42,0.6); border: 1px solid rgba(239,68,68,0.2); border-radius: 1rem; padding: 1rem; margin-top: 0.5rem; }
        .allergen-panel-title { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-bottom: 0.5rem; }
        .allergen-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
        .allergen-chip { padding: 0.35rem 0.75rem; border-radius: 9999px; border: 1.5px solid rgba(239,68,68,0.3); background: transparent; color: #fca5a5; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; }
        .allergen-chip:hover { background: rgba(239,68,68,0.1); }
        .allergen-chip.selected { background: rgba(239,68,68,0.25); border-color: #ef4444; color: #fff; }
        .additive-chip { border-color: rgba(251,191,36,0.3); color: #fde68a; }
        .additive-chip:hover { background: rgba(251,191,36,0.1); }
        .additive-chip.selected { background: rgba(251,191,36,0.2); border-color: #f59e0b; color: #fff; }
        .allergen-hint { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
        .allergen-clear-btn { margin-top: 0.625rem; padding: 0.375rem 0.875rem; border-radius: 9999px; border: 1.5px solid rgba(148,163,184,0.2); background: transparent; color: #94a3b8; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.2s; }
        .allergen-clear-btn:hover { background: rgba(148,163,184,0.1); color: #f1f5f9; }

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

        .active-filter-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25); border-radius: 0.75rem; padding: 0.625rem 1rem; margin-bottom: 1.5rem; font-size: 0.8rem; color: #fca5a5; display: none; }
        .active-filter-banner.visible { display: block; }

        .footer { background: ${bgTheme.header}f2; backdrop-filter: blur(12px); border-top: 1px solid rgba(148,163,184,0.1); padding: 2rem 1rem; margin-top: 3rem; text-align: center; color: #94a3b8; }
        .empty-state { text-align: center; padding: 5rem 1rem; color: #64748b; }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <div class="logo-section">
                <div class="logo">&#127863;</div>
                <div>
                    <h1>${esc(barName)}</h1>
                    ${tableNumber ? `<div class="table-info">Tisch ${esc(tableNumber)}</div>` : ''}
                </div>
            </div>

            <div class="search-row">
                <div class="search-wrapper">
                    <div class="search-container">
                        <span class="search-icon">&#128269;</span>
                        <input
                            type="search"
                            id="search-input"
                            class="search-input"
                            placeholder="Getraenk, Zutat, Allergen suchen..."
                            oninput="onSearchInput(this.value)"
                            autocomplete="off"
                            autocorrect="off"
                            autocapitalize="off"
                            spellcheck="false"
                            inputmode="search"
                        >
                        <button class="search-clear" id="search-clear-btn" aria-label="Suche leeren">&#10005;</button>
                    </div>
                    <div class="search-result-count" id="search-result-count"></div>
                </div>
                ${hasAllergenData ? `<button class="allergen-toggle-btn" id="allergen-toggle-btn" >&#9888;&#65039; Filter <span class="allergen-badge" id="allergen-count-badge" style="display:none">0</span></button>` : ''}
            </div>

            ${hasAllergenData ? `
            <div class="allergen-panel" id="allergen-panel">
                <div class="allergen-panel-inner">
                    <p class="allergen-panel-title">Produkte ausblenden die enthalten:</p>
                    ${allAllergens.length > 0 ? `
                    <p class="allergen-panel-title" style="color:#fca5a5">Allergene</p>
                    <div class="allergen-chips">
                        ${allAllergens.map(a => `<button class="allergen-chip" data-allergen="${esc(a)}">${esc(a)}</button>`).join('')}
                    </div>` : ''}
                    ${allAdditives.length > 0 ? `
                    <p class="allergen-panel-title" style="color:#fde68a">Zusatzstoffe</p>
                    <div class="allergen-chips">
                        ${allAdditives.map(a => `<button class="allergen-chip additive-chip" data-additive="${esc(a)}">${esc(a)}</button>`).join('')}
                    </div>` : ''}
                    <p class="allergen-hint">Ausgewaehlt = wird ausgeblendet</p>
                    <button class="allergen-clear-btn" id="clear-allergen-btn">&#10005; Alle Filter zuruecksetzen</button>
                </div>
            </div>` : ''}

            <div class="filters" id="filter-bar">
                ${categories.map((cat, i) => `<button class="filter-btn ${i === 0 ? 'active' : ''}" data-cat="${esc(cat)}">${esc(cat)}</button>`).join('')}
            </div>
        </div>
    </header>

    <main class="content">
        <div class="active-filter-banner" id="active-filter-banner"></div>

        <div class="grid" id="menu-grid">
            ${sortedItems.length === 0
                ? `<div class="empty-state"><div style="font-size:4rem;opacity:0.5">&#127863;</div><h2>Keine Getraenke verfuegbar</h2><p>Die Getraenkekarte wird gerade aktualisiert.</p></div>`
                : sortedItems.map(item => {
                    const allergenList = Array.isArray(item.allergens_list) ? item.allergens_list : [];
                    const additiveList = Array.isArray(item.additives) ? item.additives : [];
                    const legacyAllergen = item.allergens ? item.allergens : '';
                    const searchAllergenStr = [...allergenList, ...additiveList, legacyAllergen].join(' ').toLowerCase();
                    const allergenDataAttr = allergenList.length ? ` data-allergens="${esc(allergenList.join('||').toLowerCase())}"` : '';
                    const additiveDataAttr = additiveList.length ? ` data-additives="${esc(additiveList.join('||').toLowerCase())}"` : '';

                    return `<div class="card" data-category="${esc(item.category || 'Sonstiges')}" data-name="${esc((item.name || '').toLowerCase())}" data-description="${esc((item.description || '').toLowerCase())}" data-search-allergens="${esc(searchAllergenStr)}"${allergenDataAttr}${additiveDataAttr}>
                    ${item.image_url ? `<img src="${esc(item.image_url)}" alt="${esc(item.name)}" class="card-image" loading="lazy">` : ''}
                    <div class="card-content">
                        <h3 class="card-title">${esc(item.name)}</h3>
                        ${item.description ? `<p class="card-description">${esc(item.description)}</p>` : ''}
                        <div class="card-footer"><div class="price">&#8364;${item.price ? Number(item.price).toFixed(2) : '0.00'}</div></div>
                        <div class="badges">
                            ${item.category ? `<span class="badge badge-category">${esc(item.category)}</span>` : ''}
                            ${item.size ? `<span class="badge badge-outline">${esc(item.size)}</span>` : ''}
                            ${item.alcohol_content ? `<span class="badge badge-outline">${item.alcohol_content}% Vol.</span>` : ''}
                            ${item.is_seasonal ? `<span class="badge badge-special">Saisonal</span>` : ''}
                            ${item.is_special ? `<span class="badge badge-special">Special</span>` : ''}
                        </div>
                        ${(allergenList.length || item.allergens || additiveList.length) ? `<div class="allergens">
                            ${allergenList.length ? `<div><strong>Allergene:</strong> ${allergenList.map(a => esc(a)).join(', ')}</div>` : item.allergens ? `<div><strong>Allergene:</strong> ${esc(item.allergens)}</div>` : ''}
                            ${additiveList.length ? `<div style="margin-top:0.25rem"><strong>Zusatzstoffe:</strong> ${additiveList.map(a => esc(a)).join(', ')}</div>` : ''}
                        </div>` : ''}
                    </div>
                </div>`;
                }).join('')}
        </div>
    </main>

    <footer class="footer">
        ${companyInfo.address ? `<p>${esc(companyInfo.address)}</p>` : ''}
        <p>${companyInfo.phone ? `Tel: ${esc(companyInfo.phone)}` : ''}${companyInfo.phone && companyInfo.email ? ' &bull; ' : ''}${companyInfo.email ? `E-Mail: ${esc(companyInfo.email)}` : ''}</p>
        <p style="margin-top:1rem;font-size:0.875rem;">&copy; 2026 ${esc(barName)}</p>
    </footer>

    <script>
        // ── All logic runs after DOM is ready ──────────────────────────
        document.addEventListener('DOMContentLoaded', function() {

            // ── State ────────────────────────────────────────────────
            var activeCategory = 'Alle';
            var searchQuery    = '';
            var excludedAllergens = {};
            var excludedAdditives = {};
            var debounceTimer  = null;

            // ── Helpers ──────────────────────────────────────────────
            function $(id) { return document.getElementById(id); }

            // ── Search ───────────────────────────────────────────────
            var searchInput = $('search-input');
            var clearBtn    = $('search-clear-btn');

            if (searchInput) {
                searchInput.addEventListener('input', function() {
                    var val = searchInput.value;
                    if (clearBtn) clearBtn.classList.toggle('visible', val.length > 0);
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(function() {
                        searchQuery = val.toLowerCase().trim();
                        applyFilters();
                    }, 150);
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener('click', function() {
                    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
                    clearBtn.classList.remove('visible');
                    searchQuery = '';
                    applyFilters();
                });
            }

            // ── Category filter ──────────────────────────────────────
            var filterBar = $('filter-bar');
            if (filterBar) {
                filterBar.addEventListener('click', function(e) {
                    var btn = e.target.closest('.filter-btn');
                    if (!btn) return;
                    activeCategory = btn.getAttribute('data-cat');
                    document.querySelectorAll('.filter-btn').forEach(function(b) {
                        b.classList.remove('active');
                    });
                    btn.classList.add('active');
                    applyFilters();
                });
            }

            // ── Allergen panel toggle ─────────────────────────────────
            var allergenToggleBtn = $('allergen-toggle-btn');
            if (allergenToggleBtn) {
                allergenToggleBtn.addEventListener('click', function() {
                    var panel = $('allergen-panel');
                    if (panel) panel.classList.toggle('open');
                });
            }

            // ── Allergen chip clicks (delegated) ─────────────────────
            var allergenPanel = $('allergen-panel');
            if (allergenPanel) {
                allergenPanel.addEventListener('click', function(e) {
                    var chip = e.target.closest('.allergen-chip');
                    if (!chip) return;
                    var allergen = chip.getAttribute('data-allergen');
                    var additive = chip.getAttribute('data-additive');
                    if (allergen !== null) {
                        if (excludedAllergens[allergen]) {
                            delete excludedAllergens[allergen];
                            chip.classList.remove('selected');
                        } else {
                            excludedAllergens[allergen] = true;
                            chip.classList.add('selected');
                        }
                    } else if (additive !== null) {
                        if (excludedAdditives[additive]) {
                            delete excludedAdditives[additive];
                            chip.classList.remove('selected');
                        } else {
                            excludedAdditives[additive] = true;
                            chip.classList.add('selected');
                        }
                    }
                    updateAllergenBadge();
                    applyFilters();
                });
            }

            // ── Clear allergen filter ────────────────────────────────
            var clearAllergenBtn = $('clear-allergen-btn');
            if (clearAllergenBtn) {
                clearAllergenBtn.addEventListener('click', function() {
                    excludedAllergens = {};
                    excludedAdditives = {};
                    document.querySelectorAll('.allergen-chip.selected').forEach(function(c) {
                        c.classList.remove('selected');
                    });
                    updateAllergenBadge();
                    applyFilters();
                });
            }

            // ── Update allergen badge & banner ───────────────────────
            function updateAllergenBadge() {
                var aKeys = Object.keys(excludedAllergens);
                var dKeys = Object.keys(excludedAdditives);
                var total = aKeys.length + dKeys.length;
                var badge  = $('allergen-count-badge');
                var btn    = $('allergen-toggle-btn');
                var banner = $('active-filter-banner');
                if (badge) { badge.style.display = total > 0 ? 'inline-flex' : 'none'; badge.textContent = total; }
                if (btn)   { btn.classList.toggle('has-active', total > 0); }
                if (banner) {
                    if (total > 0) {
                        banner.classList.add('visible');
                        banner.textContent = 'Filter aktiv: Inhaltsstoffe ausgeblendet: ' + aKeys.concat(dKeys).join(', ');
                    } else {
                        banner.classList.remove('visible');
                        banner.textContent = '';
                    }
                }
            }

            // ── Core filter function ─────────────────────────────────
            function applyFilters() {
                var cards = document.querySelectorAll('#menu-grid .card');
                var aKeys = Object.keys(excludedAllergens);
                var dKeys = Object.keys(excludedAdditives);
                var visibleCount = 0;

                for (var i = 0; i < cards.length; i++) {
                    var card = cards[i];

                    // Category
                    var matchCat = activeCategory === 'Alle' ||
                        card.getAttribute('data-category') === activeCategory;

                    // Text search
                    var matchSearch = true;
                    if (searchQuery !== '') {
                        var name        = card.getAttribute('data-name') || '';
                        var desc        = card.getAttribute('data-description') || '';
                        var allergenStr = card.getAttribute('data-search-allergens') || '';
                        matchSearch = name.indexOf(searchQuery) !== -1 ||
                                      desc.indexOf(searchQuery) !== -1 ||
                                      allergenStr.indexOf(searchQuery) !== -1;
                    }

                    // Allergen exclusion
                    var matchAllergen = true;
                    if (aKeys.length > 0) {
                        var cardA = (card.getAttribute('data-allergens') || '').split('||');
                        for (var j = 0; j < aKeys.length; j++) {
                            for (var m = 0; m < cardA.length; m++) {
                                if (cardA[m] === aKeys[j].toLowerCase()) { matchAllergen = false; break; }
                            }
                            if (!matchAllergen) break;
                        }
                    }
                    if (matchAllergen && dKeys.length > 0) {
                        var cardD = (card.getAttribute('data-additives') || '').split('||');
                        for (var k = 0; k < dKeys.length; k++) {
                            for (var n = 0; n < cardD.length; n++) {
                                if (cardD[n] === dKeys[k].toLowerCase()) { matchAllergen = false; break; }
                            }
                            if (!matchAllergen) break;
                        }
                    }

                    var visible = matchCat && matchSearch && matchAllergen;
                    card.style.display = visible ? '' : 'none';
                    if (visible) visibleCount++;
                }

                // Result count
                var countEl = $('search-result-count');
                if (countEl) {
                    var hasFilter = searchQuery !== '' || aKeys.length > 0 || dKeys.length > 0;
                    if (hasFilter) {
                        countEl.textContent = visibleCount + ' Treffer';
                        countEl.className = 'search-result-count' + (visibleCount > 0 ? ' highlight' : '');
                    } else {
                        countEl.textContent = '';
                        countEl.className = 'search-result-count';
                    }
                }

                // No-results state
                var empty = $('no-results');
                if (visibleCount === 0) {
                    if (!empty) {
                        empty = document.createElement('div');
                        empty.id = 'no-results';
                        empty.style.cssText = 'grid-column:1/-1;text-align:center;padding:5rem 1rem;color:#64748b';
                        empty.innerHTML = '<div style="font-size:3rem;margin-bottom:1rem">&#128269;</div><h2 style="margin-bottom:0.5rem">Keine Treffer</h2><p>Versuche andere Suchbegriffe oder passe die Filter an.</p>';
                        var grid = $('menu-grid');
                        if (grid) grid.appendChild(empty);
                    }
                } else {
                    if (empty) empty.parentNode.removeChild(empty);
                }
            }

            // ── Fade-in ──────────────────────────────────────────────
            document.body.style.opacity = '0';
            setTimeout(function() {
                document.body.style.transition = 'opacity 0.4s';
                document.body.style.opacity = '1';
            }, 50);

        }); // end DOMContentLoaded
    </script>
</body>
</html>`;

        return new Response(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    } catch (error) {
        console.error('Fehler:', error);
        return new Response('<html><head><meta charset="UTF-8"><title>Fehler</title></head><body style="font-family:sans-serif;background:#0f172a;color:#f1f5f9;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center"><div><h1 style="color:#f59e0b">Fehler</h1><p>Die Getraenkekarte konnte nicht geladen werden.</p></div></body></html>', {
            status: 500,
            headers: { 'Content-Type': 'text/html' }
        });
    }
});

