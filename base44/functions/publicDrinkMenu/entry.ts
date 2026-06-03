import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const url = new URL(req.url);
        const tableNumber = url.searchParams.get('table');

        const [items, companyData] = await Promise.all([
            base44.asServiceRole.entities.MenuItem.list(),
            base44.asServiceRole.entities.CompanyInfo.list(),
        ]);

        const sortedItems = items.sort((a, b) => (a.order_position || 999) - (b.order_position || 999));
        const companyInfo = companyData[0] || {};
        const barName = companyInfo.company_name || 'Bar';

        const esc = (str) => String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

        const ACCENT_MAP = {
            amber:  { from: '#f59e0b', via: '#f97316', glow: '#f59e0b33' },
            orange: { from: '#f97316', via: '#ef4444', glow: '#f9731633' },
            rose:   { from: '#f43f5e', via: '#e11d48', glow: '#f43f5e33' },
            violet: { from: '#7c3aed', via: '#6d28d9', glow: '#7c3aed33' },
            blue:   { from: '#3b82f6', via: '#2563eb', glow: '#3b82f633' },
            cyan:   { from: '#06b6d4', via: '#0891b2', glow: '#06b6d433' },
            green:  { from: '#22c55e', via: '#16a34a', glow: '#22c55e33' },
            pink:   { from: '#ec4899', via: '#db2777', glow: '#ec489933' },
        };

        const accent = ACCENT_MAP[companyInfo.accent_color_key] || ACCENT_MAP.amber;

        const BG_MAP = {
            default: { bg: '#111827', card: '#1e2d45' },
            deep:    { bg: '#0a0a0a', card: '#1c1c1c' },
            navy:    { bg: '#0d1a36', card: '#142347' },
            slate:   { bg: '#0f172a', card: '#1e2636' },
            wine:    { bg: '#1a0a12', card: '#2d1420' },
        };
        const bg = BG_MAP[companyInfo.bg_color_key] || BG_MAP.default;

        const categories = ['Alle', ...new Set(
            sortedItems.map(i => i.category || 'Sonstiges').filter(Boolean)
        )];

        const allAllergens = [...new Set(
            sortedItems.flatMap(i => Array.isArray(i.allergens_list) ? i.allergens_list : [])
        )].sort();
        const allAdditives = [...new Set(
            sortedItems.flatMap(i => Array.isArray(i.additives) ? i.additives : [])
        )].sort();
        const hasFilterData = allAllergens.length > 0 || allAdditives.length > 0;

        const allergenChipsHtml = allAllergens.map(a => `<button class="chip" data-allergen="${esc(a.toLowerCase())}" onclick="toggleChip(this,'a')">${esc(a)}</button>`).join('');
        const additiveChipsHtml = allAdditives.map(a => `<button class="chip add" data-additive="${esc(a.toLowerCase())}" onclick="toggleChip(this,'d')">${esc(a)}</button>`).join('');
        const categoryButtonsHtml = categories.map((c, i) => `<button class="cat-btn${i === 0 ? ' on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');

        const allergenPanelHtml = !hasFilterData ? '' : `
        <div id="allergen-panel" class="allergen-panel">
            <div class="allergen-panel-inner">
                ${allAllergens.length > 0 ? `
                <div class="panel-label">Allergene ausblenden</div>
                <div class="chip-row">
                    ${allergenChipsHtml}
                </div>` : ''}
                ${allAdditives.length > 0 ? `
                <div class="panel-label">Zusatzstoffe ausblenden</div>
                <div class="chip-row">
                    ${additiveChipsHtml}
                </div>` : ''}
                <button class="panel-clear" onclick="clearFilters()">Alle zurücksetzen</button>
                <div style="font-size:0.7rem;color:var(--fg-subtle);margin-top:0.5rem">Kein Ersatz für individuelle Allergikerberatung.</div>
            </div>
        </div>
        <div id="filter-banner" class="filter-banner"></div>`;

        const filterButtonHtml = !hasFilterData ? '' : `<button id="allergen-btn" class="allergen-btn">
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
                </svg>
                Filter
                <span id="allergen-badge" class="allergen-badge">0</span>
            </button>`;

        let itemsHtml = '';
        if (sortedItems.length === 0) {
            itemsHtml = '<div class="empty"><div class="empty-icon">🍹</div><div class="empty-text">Keine Getränke verfügbar</div></div>';
        } else {
            itemsHtml = sortedItems.map((item, idx) => {
                const allergenArr = Array.isArray(item.allergens_list) ? item.allergens_list : [];
                const additiveArr = Array.isArray(item.additives) ? item.additives : [];
                const legacyA = item.allergens || '';
                const searchA = [...allergenArr, ...additiveArr, legacyA].join(' ').toLowerCase();
                const imageHtml = item.image_url ? `<img class="card-img" src="${esc(item.image_url)}" alt="${esc(item.name)}" loading="lazy">` : '';
                const descHtml = item.description ? `<div class="card-desc">${esc(item.description)}</div>` : '';
                const price = item.price ? Number(item.price).toFixed(2) : '–';
                const categoryBadge = item.category ? `<span class="badge badge-cat">${esc(item.category)}</span>` : '';
                const sizeBadge = item.size ? `<span class="badge badge-info">${esc(item.size)}</span>` : '';
                const alcBadge = item.alcohol_content ? `<span class="badge badge-info">${item.alcohol_content}% Vol.</span>` : '';
                const seasonalBadge = item.is_seasonal ? '<span class="badge badge-special">Saisonal</span>' : '';
                const specialBadge = item.is_special ? '<span class="badge badge-special">Special</span>' : '';
                let allergenHtml = '';
                if (allergenArr.length || legacyA || additiveArr.length) {
                    allergenHtml = '<div class="allergen-info">';
                    if (allergenArr.length) {
                        allergenHtml += `<div><strong>Allergene:</strong> ${allergenArr.map(a => esc(a)).join(', ')}</div>`;
                    } else if (legacyA) {
                        allergenHtml += `<div><strong>Allergene:</strong> ${esc(legacyA)}</div>`;
                    }
                    if (additiveArr.length) {
                        allergenHtml += `<div><strong>Zusatzstoffe:</strong> ${additiveArr.map(a => esc(a)).join(', ')}</div>`;
                    }
                    allergenHtml += '</div>';
                }
                const allergenDataAttr = allergenArr.length ? ` data-allergens="${esc(allergenArr.join('|').toLowerCase())}"` : '';
                const additiveDataAttr = additiveArr.length ? ` data-additives="${esc(additiveArr.join('|').toLowerCase())}"` : '';
                return `<div class="card" data-cat="${esc(item.category || 'Sonstiges')}" data-name="${esc((item.name || '').toLowerCase())}" data-desc="${esc((item.description || '').toLowerCase())}" data-sa="${esc(searchA)}"${allergenDataAttr}${additiveDataAttr} style="animation-delay:${idx * 35}ms">
                    ${imageHtml}
                    <div class="card-body">
                        <div class="card-name">${esc(item.name)}</div>
                        ${descHtml}
                        <div class="card-bottom">
                            <div class="price">€${price}</div>
                            <div class="badges">
                                ${categoryBadge}
                                ${sizeBadge}
                                ${alcBadge}
                                ${seasonalBadge}
                                ${specialBadge}
                            </div>
                        </div>
                        ${allergenHtml}
                    </div>
                </div>`;
            }).join('');
        }

        const html = `<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="${bg.bg}">
    <title>${esc(barName)} – Getränkekarte</title>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --bg:           ${bg.bg};
            --card:         ${bg.card};
            --border:       rgba(148,163,184,0.12);
            --border-hover: rgba(148,163,184,0.22);
            --fg:           #f1f5f9;
            --fg-muted:     #94a3b8;
            --fg-subtle:    #64748b;
            --primary:      ${accent.from};
            --primary-via:  ${accent.via};
            --primary-glow: ${accent.glow};
            --radius:       0.75rem;
            --radius-lg:    1.25rem;
            --radius-full:  9999px;
        }
        html { font-size: 16px; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
            background-color: var(--bg);
            color: var(--fg);
            min-height: 100vh; min-height: 100dvh;
            overflow-x: hidden;
            padding-bottom: env(safe-area-inset-bottom, 1.5rem);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 9999px; }

        @keyframes fadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        .header {
            position: sticky; top: 0; z-index: 50;
            background: color-mix(in srgb, var(--bg) 90%, transparent);
            backdrop-filter: blur(20px) saturate(160%);
            -webkit-backdrop-filter: blur(20px) saturate(160%);
            border-bottom: 1px solid var(--border);
            padding: 1rem 1rem 0.75rem;
            animation: slideDown 0.3s ease-out;
        }
        .header-inner { max-width: 900px; margin: 0 auto; }
        .brand-row { display: flex; align-items: center; gap: 0.875rem; margin-bottom: 1rem; }
        .brand-icon {
            width: 44px; height: 44px; border-radius: var(--radius);
            background: linear-gradient(135deg, var(--primary) 0%, var(--primary-via) 100%);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.375rem; flex-shrink: 0;
            box-shadow: 0 4px 14px var(--primary-glow);
        }
        .brand-name { font-size: 1.25rem; font-weight: 700; color: var(--fg); letter-spacing: -0.01em; }
        .brand-sub  { font-size: 0.75rem; color: var(--fg-muted); margin-top: 0.125rem; }

        .search-row { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.625rem; }
        .search-wrap { flex: 1; position: relative; }
        .search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: var(--fg-subtle); pointer-events: none; }
        .search-input {
            width: 100%; height: 44px;
            padding: 0 0.875rem 0 2.5rem;
            border-radius: var(--radius-full);
            border: 1.5px solid var(--border);
            background: var(--card);
            color: var(--fg); font-size: 0.9375rem;
            outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .search-input::placeholder { color: var(--fg-subtle); }
        .search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-glow); }
        .search-clear {
            position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%);
            color: var(--fg-subtle); cursor: pointer; display: none;
            background: none; border: none; font-size: 1rem; padding: 0.25rem;
        }
        .search-clear.visible { display: block; }

        .allergen-btn {
            height: 44px; padding: 0 1rem;
            border-radius: var(--radius-full);
            border: 1.5px solid var(--border);
            background: var(--card); color: var(--fg-muted);
            cursor: pointer; white-space: nowrap;
            font-size: 0.875rem; font-weight: 600;
            transition: all 0.2s; display: flex; align-items: center; gap: 0.375rem; flex-shrink: 0;
        }
        .allergen-btn:hover { border-color: var(--border-hover); color: var(--fg); }
        .allergen-btn.active { border-color: #ef4444; background: rgba(239,68,68,0.12); color: #fca5a5; }
        .allergen-badge {
            width: 1.125rem; height: 1.125rem; border-radius: 9999px;
            background: #ef4444; color: #fff; font-size: 0.65rem; font-weight: 700;
            display: none; align-items: center; justify-content: center;
        }
        .allergen-badge.visible { display: inline-flex; }

        .allergen-panel { overflow: hidden; max-height: 0; opacity: 0; transition: max-height 0.3s ease, opacity 0.2s ease; margin-bottom: 0; }
        .allergen-panel.open { max-height: 500px; opacity: 1; margin-bottom: 0.625rem; }
        .allergen-panel-inner {
            background: color-mix(in srgb, var(--card) 80%, transparent);
            border: 1px solid rgba(239,68,68,0.2);
            border-radius: var(--radius); padding: 0.875rem; margin-top: 0.5rem;
        }
        .panel-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-muted); margin-bottom: 0.5rem; }
        .chip-row { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-bottom: 0.625rem; }
        .chip {
            padding: 0.3rem 0.7rem; border-radius: var(--radius-full);
            border: 1.5px solid rgba(239,68,68,0.3);
            background: transparent; color: #fca5a5;
            cursor: pointer; font-size: 0.8rem; font-weight: 600;
            transition: all 0.15s; user-select: none;
        }
        .chip:hover { background: rgba(239,68,68,0.12); }
        .chip.on { background: rgba(239,68,68,0.22); border-color: #ef4444; color: #fff; }
        .chip.add { border-color: rgba(251,191,36,0.3); color: #fde68a; }
        .chip.add:hover { background: rgba(251,191,36,0.1); }
        .chip.add.on { background: rgba(251,191,36,0.2); border-color: #f59e0b; color: #fff; }
        .panel-clear {
            padding: 0.3rem 0.75rem; border-radius: var(--radius-full);
            border: 1.5px solid var(--border); background: transparent;
            color: var(--fg-muted); cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all 0.15s;
        }
        .panel-clear:hover { background: var(--card); color: var(--fg); }
        .filter-banner {
            padding: 0.5rem 0.875rem; border-radius: var(--radius);
            background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
            font-size: 0.8rem; color: #fca5a5;
            display: none; margin-bottom: 0.625rem; line-height: 1.4;
        }
        .filter-banner.visible { display: block; }

        .cat-bar {
            display: flex; gap: 0.375rem; overflow-x: auto;
            padding: 0.375rem 0 0.5rem;
            -ms-overflow-style: none; scrollbar-width: none;
        }
        .cat-bar::-webkit-scrollbar { display: none; }
        .cat-btn {
            padding: 0.5rem 1rem; border-radius: var(--radius-full);
            border: 1.5px solid var(--border); background: var(--card);
            color: var(--fg-muted); cursor: pointer; white-space: nowrap;
            font-size: 0.8125rem; font-weight: 600; transition: all 0.2s; flex-shrink: 0;
            -webkit-tap-highlight-color: transparent;
        }
        .cat-btn:hover { border-color: var(--border-hover); color: var(--fg); }
        .cat-btn.on {
            background: linear-gradient(90deg, var(--primary), var(--primary-via));
            color: #0f172a; border-color: transparent; font-weight: 700;
            box-shadow: 0 2px 12px var(--primary-glow);
        }

        .main { max-width: 900px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
        @media (max-width: 480px) { .grid { grid-template-columns: 1fr; gap: 0.75rem; } }

        .card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            overflow: hidden;
            transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
            animation: fadeUp 0.4s ease-out backwards;
        }
        @media (hover: hover) {
            .card:hover {
                transform: translateY(-4px);
                border-color: var(--border-hover);
                box-shadow: 0 12px 32px rgba(0,0,0,0.4), 0 0 0 1px var(--primary-glow);
            }
        }
        .card-img { width: 100%; height: 200px; object-fit: cover; display: block; }
        .card-body { padding: 1rem; }
        .card-name { font-size: 1.0625rem; font-weight: 700; color: var(--fg); margin-bottom: 0.375rem; letter-spacing: -0.01em; line-height: 1.3; }
        .card-desc { font-size: 0.875rem; color: var(--fg-muted); line-height: 1.55; margin-bottom: 0.75rem; }
        .card-bottom { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
        .price {
            font-size: 1.375rem; font-weight: 800; letter-spacing: -0.02em;
            background: linear-gradient(90deg, var(--primary), var(--primary-via));
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
        .badge { padding: 0.2rem 0.55rem; border-radius: var(--radius-full); font-size: 0.7rem; font-weight: 600; border: 1px solid; }
        .badge-cat { background: color-mix(in srgb, var(--primary) 15%, transparent); border-color: color-mix(in srgb, var(--primary) 30%, transparent); color: var(--primary); }
        .badge-info { background: rgba(148,163,184,0.1); border-color: rgba(148,163,184,0.2); color: var(--fg-muted); }
        .badge-special { background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.3); color: #fde68a; }
        .allergen-info { margin-top: 0.625rem; padding-top: 0.625rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--fg-subtle); line-height: 1.5; }
        .allergen-info strong { color: var(--fg-muted); }

        .empty { grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--fg-subtle); }
        .empty-icon { font-size: 3rem; margin-bottom: 0.75rem; opacity: 0.4; }
        .empty-text { font-size: 0.9375rem; }

        .footer {
            text-align: center; color: var(--fg-subtle); font-size: 0.8125rem;
            padding: 2rem 1rem 1rem; border-top: 1px solid var(--border); line-height: 1.6;
        }
        .footer a { color: var(--fg-muted); text-decoration: none; }
        .footer a:hover { color: var(--fg); }
    </style>
</head>
<body>

<header class="header">
    <div class="header-inner">
        <div class="brand-row">
            <div class="brand-icon">🍹</div>
            <div>
                <div class="brand-name">${esc(barName)}</div>
                <div class="brand-sub">${tableNumber ? `Tisch ${esc(tableNumber)} · ` : ''}Getränkekarte</div>
            </div>
        </div>
        <div class="search-row">
            <div class="search-wrap">
                <span class="search-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                </span>
                <input id="search" type="search" class="search-input" placeholder="Suchen…" autocomplete="off" inputmode="search">
                <button id="search-clear" class="search-clear" aria-label="Löschen">✕</button>
            </div>
            ${filterButtonHtml}
        </div>
        ${allergenPanelHtml}
        <div class="cat-bar" id="cat-bar">
            ${categoryButtonsHtml}
        </div>
    </div>
</header>

<main class="main">
    <div class="grid" id="grid">
        ${itemsHtml}
    </div>
</main>

<footer class="footer">
    ${companyInfo.address ? `<div>${esc(companyInfo.address)}</div>` : ''}
    ${(companyInfo.phone || companyInfo.email) ? `<div>
        ${companyInfo.phone ? `<a href="tel:${esc(companyInfo.phone)}">${esc(companyInfo.phone)}</a>` : ''}
        ${companyInfo.phone && companyInfo.email ? ' · ' : ''}
        ${companyInfo.email ? `<a href="mailto:${esc(companyInfo.email)}">${esc(companyInfo.email)}</a>` : ''}
    </div>` : ''}
    <div style="margin-top:0.75rem;opacity:0.4">© ${new Date().getFullYear()} ${esc(barName)}</div>
</footer>

<script>
document.addEventListener('DOMContentLoaded', function() {
    var activeCat = 'Alle', searchQ = '', excludedA = new Set(), excludedD = new Set(), panelOpen = false, debounce;
    var searchEl = document.getElementById('search');
    var clearBtn = document.getElementById('search-clear');
    if (searchEl) {
        searchEl.addEventListener('input', function() {
            clearTimeout(debounce);
            debounce = setTimeout(function() {
                searchQ = searchEl.value.toLowerCase().trim();
                if (clearBtn) clearBtn.className = searchQ ? 'search-clear visible' : 'search-clear';
                run();
            }, 150);
        });
    }
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            searchEl.value = ''; searchQ = ''; clearBtn.className = 'search-clear'; run();
        });
    }
    var catBar = document.getElementById('cat-bar');
    if (catBar) {
        catBar.addEventListener('click', function(e) {
            var btn = e.target.closest('.cat-btn');
            if (!btn) return;
            document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('on'); });
            btn.classList.add('on');
            activeCat = btn.getAttribute('data-cat');
            run();
        });
    }
    var allergenBtn = document.getElementById('allergen-btn');
    var panel = document.getElementById('allergen-panel');
    if (allergenBtn && panel) {
        allergenBtn.addEventListener('click', function() {
            panelOpen = !panelOpen;
            panel.classList.toggle('open', panelOpen);
            syncBtn();
        });
    }
    window.toggleChip = function(chip, type) {
        var key = chip.getAttribute('data-allergen') || chip.getAttribute('data-additive');
        var set = type === 'a' ? excludedA : excludedD;
        if (set.has(key)) { set.delete(key); chip.classList.remove('on'); }
        else { set.add(key); chip.classList.add('on'); }
        syncBtn(); run();
    };
    window.clearFilters = function() {
        excludedA.clear(); excludedD.clear();
        document.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('on'); });
        syncBtn(); run();
    };
    function syncBtn() {
        var total = excludedA.size + excludedD.size;
        var badge = document.getElementById('allergen-badge');
        var btn = document.getElementById('allergen-btn');
        var banner = document.getElementById('filter-banner');
        if (badge) { badge.textContent = total; badge.classList.toggle('visible', total > 0); }
        if (btn) btn.classList.toggle('active', total > 0 || panelOpen);
        if (banner) {
            if (total > 0) { banner.textContent = '⚠️ Ausgeblendet: ' + [...excludedA, ...excludedD].join(', '); banner.classList.add('visible'); }
            else { banner.classList.remove('visible'); }
        }
    }
    function run() {
        var cards = document.querySelectorAll('#grid .card');
        var visible = 0;
        cards.forEach(function(card) {
            var cat = activeCat === 'Alle' || card.getAttribute('data-cat') === activeCat;
            var name = card.getAttribute('data-name') || '', desc = card.getAttribute('data-desc') || '', sa = card.getAttribute('data-sa') || '';
            var txt = !searchQ || name.includes(searchQ) || desc.includes(searchQ) || sa.includes(searchQ);
            var ing = true;
            if (excludedA.size > 0) { var cA = card.getAttribute('data-allergens') || ''; excludedA.forEach(function(a) { if (cA.includes(a)) ing = false; }); }
            if (excludedD.size > 0) { var cD = card.getAttribute('data-additives') || ''; excludedD.forEach(function(a) { if (cD.includes(a)) ing = false; }); }
            var show = cat && txt && ing;
            card.style.display = show ? '' : 'none';
            if (show) visible++;
        });
        var empty = document.getElementById('empty-state');
        if (visible === 0) {
            if (!empty) {
                empty = document.createElement('div');
                empty.id = 'empty-state'; empty.className = 'empty';
                empty.innerHTML = '<div class="empty-icon">🔍</div><div class="empty-text">Keine Getränke gefunden</div>';
                document.getElementById('grid').appendChild(empty);
            }
            empty.style.display = '';
        } else if (empty) { empty.style.display = 'none'; }
    }
});
</script>
</body>
</html>`;

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            }
        });
    } catch (err) {
        return new Response(`<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;background:#0f172a;color:#f1f5f9">
            <h2>⚠️ Menü konnte nicht geladen werden</h2>
            <p style="color:#94a3b8;margin-top:0.5rem">Bitte versuche es erneut oder wende dich ans Personal.</p>
        </body></html>`, { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
});