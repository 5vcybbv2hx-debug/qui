/**
 * useActiveNavigation — zentrale, appweite Active-State-Logik.
 *
 * Regeln:
 * - Exakter Pfadvergleich: pathname === createPageUrl(pageName)
 * - Sonderfall Dashboard: '/' (Root-Route) zählt ebenfalls als aktiv
 * - Kein includes(), kein startsWith(), keine Substring-Vergleiche
 * - Keine Mehrfachmarkierungen möglich
 */
import { useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export function useActiveNavigation() {
    const location = useLocation();
    const pathname = location.pathname;

    /**
     * Gibt true zurück wenn die aktuelle URL exakt zur Seite gehört.
     * @param {string} pageName - Page-Name aus navigationConfig (z.B. 'Todos', 'Dashboard')
     */
    const isPageActive = (pageName) => {
        const pageUrl = createPageUrl(pageName);
        // Dashboard ist die Hauptseite und erreichbar über '/' UND '/Dashboard'
        if (pageName === 'Dashboard') {
            return pathname === '/' || pathname === pageUrl;
        }
        return pathname === pageUrl;
    };

    /**
     * Gibt true zurück wenn irgendeine Seite in einem Navigationsbereich aktiv ist.
     * Nützlich um einen Bereich in der Sidebar hervorzuheben.
     * @param {Array} pages - pages-Array aus mainNavigation
     */
    const isSectionActive = (pages) => {
        return pages.some(p => isPageActive(p.page));
    };

    return { isPageActive, isSectionActive, pathname };
}