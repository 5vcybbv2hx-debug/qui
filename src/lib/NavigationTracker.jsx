import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';
import { recordPageVisit } from '@/hooks/usePageTracking';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || null;
        }

        if (isAuthenticated && pageName) {
            try {
                base44.analytics?.track({
                    eventName: 'page_view',
                    properties: { page: pageName }
                }).catch(() => {});
            } catch (e) {
                // Silently fail - logging shouldn't break the app
            }

            // Record visit for personalized quick links
            try {
                base44.auth.me().then(user => {
                    if (user?.email) recordPageVisit(user.email, pageName);
                }).catch(() => {});
            } catch {}
        }
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}