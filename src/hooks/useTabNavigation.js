/**
 * useTabNavigation — Bottom-Tab-Navigation mit Stack-Erhaltung pro Tab.
 *
 * Jeder Tab hat seinen eigenen History-Stack. Beim Wechsel zwischen Tabs
 * wird die zuletzt besuchte Seite des jeweiligen Tabs wiederhergestellt.
 * Innerhalb eines Tabs kann man via Browser-Back navigieren.
 */

import { useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// Fallback-Root-Seiten für jeden Tab (erste Seite beim erstmaligen Besuch)
const TAB_ROOTS = {
    Dashboard:       '/',
    GuestHub:        createPageUrl('GuestHub'),
    Todos:           createPageUrl('Todos'),
    TeamCalendar:    createPageUrl('TeamCalendar'),
    OperativeListen: createPageUrl('OperativeListen'),
    Cleaning:        createPageUrl('Cleaning'),
    MeinTag:         createPageUrl('MeinTag'),
};

const STORAGE_KEY = 'bm_tab_stacks';

function loadStacks() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
        return {};
    }
}

function saveStacks(stacks) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stacks));
    } catch {}
}

export function useTabNavigation(tabPages) {
    const navigate = useNavigate();
    const location = useLocation();
    const stacksRef = useRef(loadStacks());

    // Aktiven Tab anhand der aktuellen URL bestimmen
    const getActiveTab = useCallback(() => {
        const path = location.pathname;
        for (const item of tabPages) {
            const url = item.page === 'Dashboard' ? '/' : createPageUrl(item.page);
            if (path === url || (item.page === 'Dashboard' && path === '/')) {
                return item.page;
            }
        }
        return null;
    }, [location.pathname, tabPages]);

    /**
     * Zu einem Tab navigieren.
     * - Wenn der Tab schon aktiv ist → keine Aktion (Stack bleibt)
     * - Wenn der Tab einen gespeicherten Stack hat → zur letzten URL des Tabs
     * - Sonst → zur Root-URL des Tabs
     */
    const navigateToTab = useCallback((tabPage) => {
        const activeTab = getActiveTab();

        // Schon aktiv — nichts tun
        if (activeTab === tabPage) return;

        // Aktuellen Pfad im Stack des aktiven Tabs speichern
        if (activeTab) {
            const stacks = stacksRef.current;
            stacks[activeTab] = location.pathname;
            stacksRef.current = stacks;
            saveStacks(stacks);
        }

        // Zum letzten bekannten Pfad des Ziel-Tabs navigieren
        const stacks = stacksRef.current;
        const savedPath = stacks[tabPage];
        const rootUrl = TAB_ROOTS[tabPage] || createPageUrl(tabPage);
        const targetUrl = savedPath || rootUrl;

        navigate(targetUrl);
    }, [getActiveTab, location.pathname, navigate]);

    /**
     * Speichert den aktuellen Pfad im Stack des aktiven Tabs.
     * Aufruf bei jeder Navigation innerhalb eines Tabs.
     */
    const recordCurrentPath = useCallback(() => {
        const activeTab = getActiveTab();
        if (!activeTab) return;
        const stacks = stacksRef.current;
        stacks[activeTab] = location.pathname;
        stacksRef.current = stacks;
        saveStacks(stacks);
    }, [getActiveTab, location.pathname]);

    return { navigateToTab, getActiveTab, recordCurrentPath };
}