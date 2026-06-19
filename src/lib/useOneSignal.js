import { useEffect, useRef } from 'react';

const ONESIGNAL_APP_ID = '664fda20-f8c7-411a-928f-217c855bb2bb';
const PERM_ASKED_KEY = 'onesignal_permission_asked';

/**
 * Initializes OneSignal and logs in the employee by their Employee entity ID.
 * - Requests permission only once (tracked in localStorage)
 * - Uses employeeId (Employee entity ID) as External User ID
 * - Call logout() on app sign-out
 */
export function useOneSignal({ employeeId, isAuthenticated }) {
    const initialized = useRef(false);

    useEffect(() => {
        if (!isAuthenticated || !employeeId) return;
        if (initialized.current) return;
        initialized.current = true;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function (OneSignal) {
            try {
                // Init mit explizitem await — login() erst danach
                await OneSignal.init({
                    appId: ONESIGNAL_APP_ID,
                    serviceWorkerPath: '/OneSignalSDKWorker.js',
                    notifyButton: { enable: false },
                    allowLocalhostAsSecureOrigin: true, // für lokale Entwicklung
                });

                // Employee Entity-ID als External User ID setzen
                // Damit können Backend-Funktionen per Employee-ID targeten
                const currentUserId = await OneSignal.User.getOnesignalId();
                console.log('[OneSignal] Initialized, onesignalId:', currentUserId);
                await OneSignal.login(String(employeeId));
                console.log('[OneSignal] Logged in as employee:', employeeId);
            } catch (err) {
                console.error('[OneSignal] Init error:', err);
            }
        });
    }, [isAuthenticated, employeeId]);
}

/**
 * Meldet den aktuellen Nutzer bei OneSignal ab.
 * Aufruf beim App-Logout.
 */
export async function oneSignalLogout() {
    try {
        if (window.OneSignal?.logout) {
            await window.OneSignal.logout();
        }
    } catch (err) {
        console.error('[OneSignal] Logout error:', err);
    }
}