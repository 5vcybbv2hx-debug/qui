/**
 * usePageTracking — tracks page visits per user in localStorage
 * and returns the top most-visited pages.
 */

const STORAGE_KEY = 'bm_page_visits';
const MAX_PAGES = 50; // max different pages to track

function getVisits(userEmail) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        return all[userEmail] || {};
    } catch {
        return {};
    }
}

function saveVisits(userEmail, visits) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : {};
        all[userEmail] = visits;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {}
}

export function recordPageVisit(userEmail, pageName) {
    if (!userEmail || !pageName) return;
    const visits = getVisits(userEmail);
    visits[pageName] = (visits[pageName] || 0) + 1;
    saveVisits(userEmail, visits);
}

/**
 * Returns top N pages by visit count for a given user.
 * @param {string} userEmail
 * @param {number} topN
 * @param {string[]} allowedPages - pages the user actually has permission to see
 * @returns {Array<{page: string, count: number}>}
 */
export function getTopPages(userEmail, topN = 4, allowedPages = []) {
    if (!userEmail) return [];
    const visits = getVisits(userEmail);
    return Object.entries(visits)
        .filter(([page]) => allowedPages.length === 0 || allowedPages.includes(page))
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN)
        .map(([page, count]) => ({ page, count }));
}