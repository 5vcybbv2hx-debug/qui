import { useState } from 'react';
import { usePermissions } from '@/components/auth/usePermissions';
import PermissionDenied from '@/components/auth/PermissionDenied';
import { MapPin, Layers, Package, BarChart2 } from 'lucide-react';
import StructureTab from '@/components/storage/StructureTab';
import SlotsTab from '@/components/storage/SlotsTab';
import AssignTab from '@/components/storage/AssignTab';
import StockTab from '@/components/storage/StockTab';

const TABS = [
  { id: 'structure', label: 'Struktur', icon: Layers },
  { id: 'slots', label: 'Lagerplätze', icon: MapPin },
  { id: 'assign', label: 'Zuordnen', icon: Package },
  { id: 'stock', label: 'Bestand', icon: BarChart2 },
];

export default function Storage() {
  const permissions = usePermissions();
  const [activeTab, setActiveTab] = useState('structure');

  if (permissions.isLoading) return null;
  if (!permissions.canViewInventory && !permissions.isManager) return <PermissionDenied />;

  return (
    <div className="max-w-3xl mx-auto px-3 py-4 pb-32 md:pb-8">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-6 h-6 text-amber-500" />
          Lagerverwaltung
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bereiche, Möbel, Behälter, Fächer und Artikel</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 mb-6 bg-secondary/50 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-amber-600 text-white shadow'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'structure' && <StructureTab permissions={permissions} />}
      {activeTab === 'slots' && <SlotsTab permissions={permissions} />}
      {activeTab === 'assign' && <AssignTab permissions={permissions} />}
      {activeTab === 'stock' && <StockTab permissions={permissions} />}
    </div>
  );
}