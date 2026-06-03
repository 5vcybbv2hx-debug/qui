import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { Package, Search, Layers } from 'lucide-react';
import StorageSearchTab  from '@/components/storage/SearchTab';
import StorageSlotsTab   from '@/components/storage/SlotsTab';
import StorageStructureTab from '@/components/storage/StructureTab';

const TABS = [
  { id: 'search',    label: 'Suche',    icon: Search  },
  { id: 'slots',     label: 'Fächer',   icon: Package },
  { id: 'structure', label: 'Struktur', icon: Layers  },
];

export default function Storage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState('slots');

  if (permissions.isLoading) return (
    <div className="max-w-3xl mx-auto px-3 py-8 flex flex-col items-center justify-center gap-4 min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Lade Lagerverwaltung…</p>
    </div>
  );

  if (!permissions.canViewInventory && !permissions.isManager) return <PermissionDenied />;

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 pb-32 md:pb-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-5 h-5 text-amber-500" />
          Lagerplätze
        </h1>
        <p className="text-muted-foreground text-xs mt-0.5">
          Bereich → Möbel → Fach → Artikel
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-secondary/50 rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-xs font-medium transition-all min-h-[52px] touch-manipulation',
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow'
                : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'search'    && <StorageSearchTab    permissions={permissions} />}
      {activeTab === 'slots'     && <StorageSlotsTab     permissions={permissions} />}
      {activeTab === 'structure' && <StorageStructureTab permissions={permissions} />}
    </div>
  );
}
