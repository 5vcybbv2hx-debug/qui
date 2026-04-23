// ════════════════════════════════════════════════════════════════════════════
// NEUE BERECHTIGUNGSVERWALTUNG
// ════════════════════════════════════════════════════════════════════════════
// Die alte Seite wurde durch ein komplett neues System ersetzt:
// - Zentrale Permission-Registry (lib/permissionRegistry.js)
// - Granulare Rechtevergabe auf 3 Ebenen (Seite, Unterbereich, Aktion)
// - Mobile-optimierte UI
// - Rollen-Templates + individuelle Overrides
//
// Die neue Seite ist in: pages/PermissionsNew.jsx
// Diese alte Seite wird für Abwärtskompatibilität als Redirect genutzt.
// ════════════════════════════════════════════════════════════════════════════

import PermissionsNew from './PermissionsNew';

// Export die neue Implementierung als Standard-Export
export default PermissionsNew;